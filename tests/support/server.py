"""Disposable E2E backend and policy-enforced synthetic crawl source."""
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import uvicorn
from sqlalchemy import select
from fastapi import Request
from fastapi.responses import HTMLResponse, Response

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from daleel.app import make_app
from daleel.config import Settings
from daleel.db import Workspace, Resource, Task, Spend


class Source(BaseHTTPRequestHandler):
    requests = []
    def log_message(self, *args):
        pass

    def do_GET(self):
        self.requests.append(self.path)
        if self.path == "/slow":
            time.sleep(10)  # Synthetic slow source; browser tests use observable assertions, never sleeps.
        if self.path == "/robots.txt":
            body = "User-agent: *\nAllow: /\nDisallow: /blocked\n"
        elif self.path == "/interactive":
            job = {"@type": "JobPosting", "title": "AI Engineer", "description": "Build reliable AI models in Cairo.", "hiringOrganization": {"name": "Daleel Test Labs"}}
            body = '<html><title>AI Engineer</title><body><h1>AI Engineer</h1><p>Daleel Test Labs</p><button id="expand" onclick="document.getElementById(\'details\').hidden=false">Show opportunity details</button><section id="details" hidden>Build reliable AI models in Cairo.</section><script type="application/ld+json">' + json.dumps(job) + '</script></body></html>'
        elif self.path == "/planner":
            job = {"@type": "JobPosting", "title": "AI Engineer", "description": "Build reliable AI models in Cairo.",
                   "hiringOrganization": {"name": "Daleel Test Labs"}}
            script = "const s=document.createElement('script');s.type='application/ld+json';s.textContent=" + json.dumps(json.dumps(job)) + ";document.body.appendChild(s);document.getElementById('details').hidden=false"
            import html
            body = '<html><title>AI Engineer</title><body><h1>AI Engineer</h1><p>Daleel Test Labs</p><button id="expand" onclick="' + html.escape(script, quote=True) + '">Show opportunity details</button><section id="details" hidden>Build reliable AI models in Cairo.</section><script>/* dynamic research fixture */</script></body></html>'
        elif self.path.startswith("/blocked"):
            body = "This source must not be fetched."
        elif self.path == "/arabic":
            job = {"@type": "JobPosting", "title": "مهندس ذكاء اصطناعي", "description": "بناء نماذج ذكاء اصطناعي موثوقة في القاهرة.",
                   "hiringOrganization": {"name": "مختبر دليل"}, "url": "http://127.0.0.1/arabic"}
            body = '<html lang="ar" dir="rtl"><title>مهندس ذكاء اصطناعي</title><body><h1>مهندس ذكاء اصطناعي</h1><p>مختبر دليل</p><p>بناء نماذج ذكاء اصطناعي موثوقة في القاهرة.</p><script type="application/ld+json">' + json.dumps(job) + '</script></body></html>'
        elif self.path.startswith("/job"):
            job = {"@type": "JobPosting", "title": "AI Engineer", "description": "Build reliable AI models in Cairo.",
                   "hiringOrganization": {"name": "Daleel Test Labs"},
                   "jobLocation": {"address": {"addressLocality": "Cairo", "addressCountry": "Egypt"}},
                   "url": "http://127.0.0.1/job"}
            body = '<html lang="en"><title>AI Engineer</title><body><h1>AI Engineer</h1><p>Daleel Test Labs</p><p>Cairo, Egypt</p><p>Build reliable AI models in Cairo.</p><script type="application/ld+json">' + json.dumps(job) + '</script></body></html>'
        else:
            body = '<html><title>AI Engineer opportunities</title><body><h1>AI Engineer opportunities</h1><a href="/job">AI Engineer role details</a><a href="/job-copy">AI Engineer duplicate listing</a></body></html>'
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8" if self.path == "/robots.txt" else "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode())


if __name__ == "__main__":
    source = ThreadingHTTPServer(("127.0.0.1", 80), Source)
    threading.Thread(target=source.serve_forever, daemon=True).start()
    with tempfile.TemporaryDirectory(prefix="daleel-e2e-") as directory:
        settings = Settings(_env_file=None, env="test", auth_mode="development",
            dev_token=os.environ["DALEEL_E2E_TOKEN"], dev_email="e2e@daleel.local",
            operator_emails="e2e@daleel.local", database_url=f"sqlite:///{Path(directory) / 'db.sqlite'}",
            storage_root=Path(directory) / "artifacts", worker_mode="inline",
            allow_test_hosts=["127.0.0.1"], host_delay_seconds=0, browser_enabled=True,
            cors_origins=["http://127.0.0.1:5173"], frontend_url="http://127.0.0.1:5173",
            groq_api_key="", openrouter_api_key="", tavily_api_key="", google_trace_project="")
        try:
            app = make_app(settings)
            viewer_events = []
            original_models = app.state.runtime.models

            class SyntheticBrowserModels:
                enabled = False

                @property
                def available(self):
                    return self.enabled or original_models.available

                async def structured(self, wid, rid, purpose, system, data, schema, **kwargs):
                    if not self.enabled:
                        return await original_models.structured(wid, rid, purpose, system, data, schema, **kwargs)
                    if purpose == 'planning':
                        from daleel.agents import default_fields
                        return schema.model_validate({'fields': default_fields(data['query']), 'requestedCriteria': [],
                            'inferredCriteria': [], 'searchQuery': data['query']})
                    if purpose == 'browser_planning':
                        target = next(e for e in data['page']['elements'] if e['selector'] == '#expand')
                        return schema.model_validate({'action': 'click', 'ref': target['ref']})
                    raise RuntimeError('Unexpected synthetic model call')

            synthetic_models = SyntheticBrowserModels()
            app.state.runtime.models = synthetic_models
            # The application planning endpoint retains its original provider instance;
            # query schema falls back deterministically with its empty test credentials.

            @app.post('/api/__e2e__/browser-planner/{enabled}')
            def synthetic_browser_planner(enabled: bool):
                synthetic_models.enabled = enabled
                return {'enabled': enabled}

            @app.middleware('http')
            async def viewer_policy(request, call_next):
                response = await call_next(request)
                if request.url.path == '/api/__e2e__/viewer':
                    # Match the separate broker's policy rather than the API's strict app CSP.
                    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' blob:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'"
                return response

            @app.get('/api/__e2e__/viewer', response_class=HTMLResponse)
            def synthetic_viewer():
                from daleel.broker_viewer import VIEWER_HTML
                return HTMLResponse(VIEWER_HTML, headers={'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'", 'Cache-Control': 'no-store'})

            @app.get('/api/__e2e__/viewer/screen')
            def synthetic_screen():
                return Response('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900"><rect width="1280" height="900" fill="white"/><text x="80" y="100" font-size="32">Synthetic research site</text></svg>', media_type='image/svg+xml')

            @app.get('/api/__e2e__/viewer/status')
            def synthetic_status():
                return {'domain': 'research.example', 'authenticated': False, 'remainingSeconds': 1800}

            @app.post('/api/__e2e__/viewer/control')
            async def synthetic_control(request: Request):
                event = await request.json()
                viewer_events.append({k: v for k, v in event.items() if k != 'text'})
                return {'ok': True}

            @app.post('/api/__e2e__/viewer/close')
            def synthetic_close():
                return {'ok': True}

            @app.get('/api/__e2e__/viewer-events')
            def synthetic_events():
                return viewer_events

            @app.get('/api/__e2e__/snapshot')
            def snapshot():
                with app.state.database.session() as db:
                    return {
                        'resources': [{'kind': r.kind, 'data': r.data} for r in db.scalars(select(Resource))],
                        'tasks': [{'runId': t.run_id, 'state': t.state, 'result': t.result} for t in db.scalars(select(Task))],
                        'spendCount': len(list(db.scalars(select(Spend)))),
                        'workspaceCount': len(list(db.scalars(select(Workspace)))),
                        'sourceRequests': list(Source.requests),
                    }

            uvicorn.run(app, host="127.0.0.1", port=8000, access_log=False)
        finally:
            source.shutdown()
            source.server_close()
