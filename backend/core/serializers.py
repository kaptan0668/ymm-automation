from rest_framework import serializers
from .models import Customer, Document, Report, File, ContractJob

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = "__all__"

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = "__all__"

class ContractJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractJob
        fields = "__all__"
