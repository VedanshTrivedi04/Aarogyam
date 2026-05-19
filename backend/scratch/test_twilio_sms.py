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

def test_sms_notification(phone_number):
    print(f"Testing SMS to {phone_number}...")
    print(f"Using Account SID: {settings.TWILIO_ACCOUNT_SID[:5]}...")
    print(f"Using Messaging Service SID: {settings.TWILIO_MESSAGING_SERVICE_SID}")
    
    # Get or create a dummy user - using email as identifier instead of username
    test_email = 'test_notif@example.com'
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

    # Create a notification object
    notification = Notification.objects.create(
        user=user,
        notification_type='TEST',
        channel='SMS',
        title='Aarogya Test',
        body='This is a test notification from your Aarogya Messaging Service. If you see this, the integration is working!',
        status=NotificationStatus.PENDING
    )

    # Dispatch
    success = NotificationDispatcher.send_sms(notification)
    
    if success:
        print(f"SUCCESS! Message SID: {notification.external_id}")
    else:
        print(f"FAILED! Reason: {notification.failed_reason}")

if __name__ == "__main__":
    test_phone = sys.argv[1] if len(sys.argv) > 1 else "+919511634863"
    test_sms_notification(test_phone)
