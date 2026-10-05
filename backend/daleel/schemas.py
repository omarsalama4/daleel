from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Limits(Input):
    domains: int = Field(20, ge=1, le=20)
    pages: int = Field(500, ge=1, le=500)
    depth: int = Field(5, ge=0, le=5)
    minutes: int = Field(20, ge=1, le=20)
    retriesPerPage: int = Field(2, ge=0, le=2)
    downloadMb: int = Field(100, ge=1, le=100)


class PlanField(Input):
    key: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")
    label: str = Field(min_length=1, max_length=120)
    type: Literal["text", "number", "date", "url", "boolean", "list", "object", "string"] = "text"
    required: bool = False
    evidenceRule: str = "Verbatim source excerpt supporting the field value"
    enrichmentRule: str | None = None


class CreateRun(Input):
    query: str = Field(min_length=1, max_length=10000)
    mode: Literal["approval", "autonomous"] = "approval"
    relevance: Literal["broad", "balanced", "strict"] = "balanced"
    seedUrls: list[str] = Field(default_factory=list, max_length=100)
    limits: Limits = Field(default_factory=Limits)
    aiUsageCapUsd: Decimal = Field(Decimal("0.25"), ge=0, le=Decimal("0.25"), multiple_of=Decimal("0.01"))
    workflowId: str | None = None
    selectedSessionDomain: str | None = None
    filterNotes: str | None = Field(None, max_length=3000)

    @field_validator("query")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Enter a research question")
        return value.strip()


class PlanPatch(Input):
    requestedCriteria: list[str] | None = None
    inferredCriteria: list[str] | None = None
    candidateDomains: list[str] | None = Field(None, max_length=20)
    fields: list[PlanField] | None = Field(None, min_length=1, max_length=40)
    relevance: Literal["broad", "balanced", "strict"] | None = None
    limits: Limits | None = None

    @field_validator("fields")
    @classmethod
    def unique_keys(cls, value):
        if value and len({f.key for f in value}) != len(value):
            raise ValueError("Extraction field keys must be unique")
        return value


class RunAction(Input):
    action: Literal["pause", "resume", "cancel"]


class GateAction(Input):
    action: Literal["skip_task", "connect_site", "review_recipe", "stop"]


class SettingsPatch(Input):
    authenticatedContentAllowed: bool | None = None
    monthlyAiUsd: Decimal | None = Field(None, ge=0, le=5, multiple_of=Decimal("0.01"))


class FeedbackRequest(Input):
    classification: Literal["relevant", "irrelevant", "incomplete", "incorrect"]
    correction: str | None = Field(None, max_length=5000)
    fieldKey: str | None = None


class ExportRequest(Input):
    format: Literal["csv", "json", "clean_text", "url_ledger"]
    scope: Literal["filtered", "all", "selected"]
    findingIds: list[str] = Field(default_factory=list)
    includeEvidence: bool = True
    includeRawArtifacts: bool = False


class SaveWorkflow(Input):
    runId: str
    name: str = Field(min_length=1, max_length=160)


class WorkflowPatch(Input):
    name: str | None = Field(None, min_length=1, max_length=160)
    changeSummary: str = Field("Updated plan", max_length=1000)
    plan: dict


class RunWorkflow(Input):
    mode: Literal["approval", "autonomous"] = "approval"
    limits: Limits | None = None
    aiUsageCapUsd: Decimal = Field(Decimal("0.25"), ge=0, le=Decimal("0.25"), multiple_of=Decimal("0.01"))


class RecipeAction(Input):
    action: Literal["preview", "approve", "replay", "retire"]


class ConnectSite(Input):
    domain: str = Field(min_length=1, max_length=253)


class SessionPatch(Input):
    expiryMode: Literal["no_expiry", "custom", "date"]
    expiresAt: str | None = None


class CreateShare(Input):
    recipientUserId: str
    resourceType: Literal["finding", "workflow"]
    resourceId: str


class InviteUser(Input):
    email: EmailStr
    note: str | None = Field(None, max_length=1000)


class SupportAccess(Input):
    workspaceId: str
    itemId: str
    purpose: str = Field(min_length=10, max_length=1000)
