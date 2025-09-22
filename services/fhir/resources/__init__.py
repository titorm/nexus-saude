"""
FHIR Resources Package
Recursos FHIR implementados para o gateway
"""

from .patient import Patient, PatientManager
from .observation import Observation, ObservationManager
from .encounter import Encounter, EncounterManager
from .medication import Medication, MedicationRequest, MedicationManager
from .practitioner import Practitioner, PractitionerManager
from .organization import Organization, OrganizationManager

__all__ = [
    "Patient",
    "PatientManager",
    "Observation", 
    "ObservationManager",
    "Encounter",
    "EncounterManager",
    "Medication",
    "MedicationRequest",
    "MedicationManager",
    "Practitioner",
    "PractitionerManager",
    "Organization",
    "OrganizationManager"
]