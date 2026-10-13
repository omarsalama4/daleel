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
            allow_test_hosts=["127.0.0.1"], host_delay_seconds=0,
            cors_origins=["http://127.0.0.1:5173"], frontend_url="http://127.0.0.1:5173",
            groq_api_key="", openrouter_api_key="", tavily_api_key="", google_trace_project="")
        try:
            app = make_app(settings)

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
