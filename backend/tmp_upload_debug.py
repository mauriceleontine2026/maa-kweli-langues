from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.routers import auth as auth_router

app.dependency_overrides[auth_router.get_current_user] = lambda: User(id=1, email='x@y.com', full_name='X', role='user', email_verified=True)
client = TestClient(app)
payload = b'\x89PNG\r\n\x1a\n' + b'0' * 20
response = client.post('/api/auth/me/photo', files={'file': ('pic.png', payload, 'image/png')})
print('status:', response.status_code)
print(response.text[:2000])
app.dependency_overrides.clear()
