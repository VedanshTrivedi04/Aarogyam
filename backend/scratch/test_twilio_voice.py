import os
import django
import sys

# Setup Django environment
sys.path.append('d:/bighackethon/rajwardhan backend/Intelligent-Medication-Adherence-Monitoring-System-vedansh/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.identity.models import User
from apps.notifications.models import Notification, NotificationStatus
from apps.notifications.services import NotificationDispatcher
from django.conf import settings

def test_voice_call(phone_number):
    print(f"Testing Voice Call to {phone_number}...")
    print(f"Using Account SID: {settings.TWILIO_ACCOUNT_SID[:5]}...")
    print(f"Using From Number: {settings.TWILIO_FROM_NUMBER}")
    
    # Get or create test user
    test_email = 'test_notif_voice@example.com'
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={
            'phone_number': phone_number,
            'is_active': True,
            'full_name': 'Test User'
        }
    )
    if not created:
        user.phone_number = phone_number
        user.save()

    # Create a notification object with a dosage reminder message
    notification = Notification.objects.create(
        user=user,
        notification_type='DOSE_REMINDER',
        channel='VOICE',
        title='Dosage Alert',
        body='Hello. This is a reminder from Aarogya. Please take your medicine, Paracetamol 500mg, which was scheduled for now. Thank you.',
        status=NotificationStatus.PENDING
    )

    # Dispatch using the NotificationDispatcher's voice method
    success = NotificationDispatcher.send_voice(notification)
    
    if success:
        print(f"SUCCESS! Call SID: {notification.external_id}")
        print("Your phone should ring in a few seconds.")
    else:
        print(f"FAILED! Reason: {notification.failed_reason}")

if __name__ == "__main__":
    test_phone = sys.argv[1] if len(sys.argv) > 1 else "+919584441119"
    test_voice_call(test_phone)
