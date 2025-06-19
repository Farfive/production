import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import create_tables, SessionLocal
from app.models.user import User, UserRole, RegistrationStatus
from app.core.security import get_password_hash
import traceback

def main():
    create_tables()
    db = SessionLocal()
    try:
        user = User(email='foo999@example.com', password_hash=get_password_hash('Password123!'), first_name='Foo', last_name='Bar', role=UserRole.CLIENT, registration_status=RegistrationStatus.ACTIVE, is_active=True, data_processing_consent=True, marketing_consent=False)
        db.add(user)
        db.commit()
        print('insert ok')
    except Exception as e:
        traceback.print_exc()
        db.rollback()

if __name__ == '__main__':
    main() 