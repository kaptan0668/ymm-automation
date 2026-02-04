from celery import shared_task
from .models import ContractJob

@shared_task
def process_contract_job(job_id):
    job = ContractJob.objects.get(id=job_id)
    job.status = "done"
    job.save()
