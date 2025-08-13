import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class KonguMCQAPITester:
    def __init__(self, base_url="https://kongu-exam-portal.preview.emergentagent.com"):
        self.base_url = base_url
        self.student_token = None
        self.staff_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'student_id': None,
            'staff_id': None,
            'subject_id': None,
            'test_id': None
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_get_departments(self):
        """Test departments endpoint"""
        success, response = self.run_test("Get Departments", "GET", "api/departments", 200)
        if success and 'departments' in response:
            departments = response['departments']
            print(f"   Found {len(departments)} departments")
            expected_depts = ["Civil Engineering", "Computer Engineering", "Mechanical Engineering"]
            for dept in expected_depts:
                if dept in departments:
                    print(f"   ✓ {dept} found")
                else:
                    print(f"   ✗ {dept} missing")
        return success

    def test_student_registration(self):
        """Test student registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        student_data = {
            "name": f"Test Student {timestamp}",
            "register_number": f"REG{timestamp}",
            "roll_number": f"ROLL{timestamp}",
            "department": "Computer Engineering",
            "year": 2,
            "semester": 3,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Student Registration", 
            "POST", 
            "api/student/register", 
            200, 
            student_data
        )
        
        if success and 'student_id' in response:
            self.created_resources['student_id'] = response['student_id']
            print(f"   Student ID: {response['student_id']}")
        
        return success

    def test_staff_registration(self):
        """Test staff registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        staff_data = {
            "name": f"Test Staff {timestamp}",
            "department": "Computer Engineering",
            "academic_year": "2025-2026",
            "email": f"staff{timestamp}@kongu.edu",
            "password": "StaffPass123!"
        }
        
        success, response = self.run_test(
            "Staff Registration", 
            "POST", 
            "api/staff/register", 
            200, 
            staff_data
        )
        
        if success and 'staff_id' in response:
            self.created_resources['staff_id'] = response['staff_id']
            print(f"   Staff ID: {response['staff_id']}")
        
        return success

    def test_student_login(self):
        """Test student login"""
        timestamp = datetime.now().strftime("%H%M%S")
        login_data = {
            "identifier": f"REG{timestamp}",
            "password": "TestPass123!",
            "user_type": "student"
        }
        
        success, response = self.run_test(
            "Student Login", 
            "POST", 
            "api/login", 
            200, 
            login_data
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            print(f"   Student logged in successfully")
            print(f"   User: {response.get('user', {}).get('name', 'Unknown')}")
        
        return success

    def test_staff_login(self):
        """Test staff login"""
        timestamp = datetime.now().strftime("%H%M%S")
        login_data = {
            "identifier": f"staff{timestamp}@kongu.edu",
            "password": "StaffPass123!",
            "user_type": "staff"
        }
        
        success, response = self.run_test(
            "Staff Login", 
            "POST", 
            "api/login", 
            200, 
            login_data
        )
        
        if success and 'access_token' in response:
            self.staff_token = response['access_token']
            print(f"   Staff logged in successfully")
            print(f"   User: {response.get('user', {}).get('name', 'Unknown')}")
        
        return success

    def test_create_subject(self):
        """Test subject creation (staff only)"""
        if not self.staff_token:
            print("❌ No staff token available for subject creation")
            return False
            
        subject_data = {
            "name": "Data Structures and Algorithms",
            "course_code": "CS301",
            "department": "Computer Engineering"
        }
        
        success, response = self.run_test(
            "Create Subject", 
            "POST", 
            "api/staff/subjects", 
            200, 
            subject_data,
            self.staff_token
        )
        
        if success and 'subject_id' in response:
            self.created_resources['subject_id'] = response['subject_id']
            print(f"   Subject ID: {response['subject_id']}")
        
        return success

    def test_get_subjects(self):
        """Test getting subjects"""
        return self.run_test("Get Subjects", "GET", "api/subjects", 200)

    def test_create_question(self):
        """Test question creation (staff only)"""
        if not self.staff_token or not self.created_resources['subject_id']:
            print("❌ No staff token or subject ID available for question creation")
            return False
            
        question_data = {
            "question_text": "What is the time complexity of binary search?",
            "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
            "correct_answer": 1,
            "explanation": "Binary search divides the search space in half each time, resulting in O(log n) complexity.",
            "subject_id": self.created_resources['subject_id']
        }
        
        return self.run_test(
            "Create Question", 
            "POST", 
            "api/staff/questions", 
            200, 
            question_data,
            self.staff_token
        )

    def test_create_test(self):
        """Test test creation (staff only)"""
        if not self.staff_token or not self.created_resources['subject_id']:
            print("❌ No staff token or subject ID available for test creation")
            return False
            
        start_time = datetime.utcnow()
        end_time = start_time + timedelta(hours=2)
        
        test_data = {
            "subject_id": self.created_resources['subject_id'],
            "category": "CAT",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_minutes": 45
        }
        
        success, response = self.run_test(
            "Create Test", 
            "POST", 
            "api/staff/tests", 
            200, 
            test_data,
            self.staff_token
        )
        
        if success and 'test_id' in response:
            self.created_resources['test_id'] = response['test_id']
            print(f"   Test ID: {response['test_id']}")
        
        return success

    def test_get_available_tests(self):
        """Test getting available tests (student only)"""
        if not self.student_token:
            print("❌ No student token available for getting available tests")
            return False
            
        return self.run_test(
            "Get Available Tests", 
            "GET", 
            "api/student/available-tests", 
            200,
            token=self.student_token
        )

    def test_get_test_questions(self):
        """Test getting test questions (student only)"""
        if not self.student_token or not self.created_resources['test_id']:
            print("❌ No student token or test ID available for getting test questions")
            return False
            
        return self.run_test(
            "Get Test Questions", 
            "GET", 
            f"api/test/{self.created_resources['test_id']}/questions", 
            200,
            token=self.student_token
        )

    def test_submit_test(self):
        """Test test submission (student only)"""
        if not self.student_token or not self.created_resources['test_id']:
            print("❌ No student token or test ID available for test submission")
            return False
            
        # Create a mock submission
        submission_data = {
            "test_id": self.created_resources['test_id'],
            "student_id": self.created_resources['student_id'],
            "answers": {},  # Empty answers for now
            "tab_switches": 1,
            "is_malpractice": False,
            "completion_time": datetime.utcnow().isoformat()
        }
        
        return self.run_test(
            "Submit Test", 
            "POST", 
            "api/test/submit", 
            200,
            submission_data,
            self.student_token
        )

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Kongu MCQ Platform API Tests")
        print("=" * 50)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_get_departments()
        
        # Registration tests
        self.test_student_registration()
        self.test_staff_registration()
        
        # Login tests
        self.test_student_login()
        self.test_staff_login()
        
        # Staff functionality tests
        self.test_create_subject()
        self.test_get_subjects()
        self.test_create_question()
        self.test_create_test()
        
        # Student functionality tests
        self.test_get_available_tests()
        self.test_get_test_questions()
        self.test_submit_test()
        
        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the issues above.")
            return 1

def main():
    tester = KonguMCQAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())