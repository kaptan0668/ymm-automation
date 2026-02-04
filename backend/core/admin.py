from django.contrib import admin
from .models import (
    Customer,
    Document,
    Report,
    File,
    AuditLog,
    ContractJob,
    DocumentCounter,
    ReportCounterYearAll,
    ReportCounterTypeCum,
)

admin.site.register(Customer)
admin.site.register(Document)
admin.site.register(Report)
admin.site.register(File)
admin.site.register(AuditLog)
admin.site.register(ContractJob)
admin.site.register(DocumentCounter)
admin.site.register(ReportCounterYearAll)
admin.site.register(ReportCounterTypeCum)
