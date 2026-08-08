"""
Test script to verify email can be reused after deleting admin
"""
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(message):
    print(f"\n{YELLOW}TEST: {message}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def login_as_gov():
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"employee_id": "GOV-001", "password": "password123", "role": "GOVERNMENT"}
    )
    return response.json()["access_token"] if response.status_code == 200 else None

def main():
    print("\n" + "="*60)
    print("Testing Email Reuse After Delete")
    print("="*60)

    token = login_as_gov()
    if not token:
        print_error("Login failed")
        return

    headers = {"Authorization": f"Bearer {token}"}
    test_email = "reuse-test@example.com"

    # Step 1: Create first school
    print_test("Create first school")
    school1 = requests.post(
        f"{BASE_URL}/schools/",
        headers=headers,
        json={
            "udise_code": "TEST-EMAIL-1",
            "school_name": "Email Test School 1",
            "district": "Bengaluru",
            "taluk": "Bangalore North",
            "village": "Test Village",
            "status": "Active"
        }
    ).json()
    print_success(f"Created school 1: {school1['school_name']} (ID: {school1['id']})")

    # Step 2: Create admin with test email
    print_test(f"Create admin with email: {test_email}")
    admin1 = requests.post(
        f"{BASE_URL}/users/",
        headers=headers,
        json={
            "first_name": "Test",
            "last_name": "Admin1",
            "email": test_email,
            "phone": "+91-1111111111",
            "password": "test123",
            "school_id": school1['id']
        }
    ).json()
    print_success(f"Created admin: {admin1['employee_id']} with email {test_email}")

    # Step 3: Delete the school (should delete admin too)
    print_test("Delete school 1 (should also delete admin)")
    delete_resp = requests.delete(f"{BASE_URL}/schools/{school1['id']}", headers=headers)
    if delete_resp.status_code == 204:
        print_success("School deleted successfully")
    else:
        print_error(f"Delete failed: {delete_resp.text}")
        return

    # Step 4: Create second school
    print_test("Create second school")
    school2 = requests.post(
        f"{BASE_URL}/schools/",
        headers=headers,
        json={
            "udise_code": "TEST-EMAIL-2",
            "school_name": "Email Test School 2",
            "district": "Mysuru",
            "taluk": "Mysuru",
            "village": "Test Village 2",
            "status": "Active"
        }
    ).json()
    print_success(f"Created school 2: {school2['school_name']} (ID: {school2['id']})")

    # Step 5: Try to create admin with SAME email
    print_test(f"Create new admin with SAME email: {test_email} (should work now)")
    admin2_resp = requests.post(
        f"{BASE_URL}/users/",
        headers=headers,
        json={
            "first_name": "Test",
            "last_name": "Admin2",
            "email": test_email,  # SAME EMAIL
            "phone": "+91-2222222222",
            "password": "test456",
            "school_id": school2['id']
        }
    )
    
    if admin2_resp.status_code == 201:
        admin2 = admin2_resp.json()
        print_success(f"✓ SUCCESS! Created new admin: {admin2['employee_id']} with same email {test_email}")
    else:
        error = admin2_resp.json().get('detail', 'Unknown error')
        print_error(f"✗ FAILED! Cannot reuse email: {error}")
        print_error("BUG: Email still exists in database even after deletion!")

    # Cleanup
    print_test("Cleanup: Delete school 2")
    requests.delete(f"{BASE_URL}/schools/{school2['id']}", headers=headers)
    print_success("Cleanup complete")

    print("\n" + "="*60)
    if admin2_resp.status_code == 201:
        print(f"{GREEN}ALL TESTS PASSED! ✓{RESET}")
    else:
        print(f"{RED}TEST FAILED! Email reuse not working.{RESET}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
