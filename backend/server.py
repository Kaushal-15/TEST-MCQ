from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import jwt
import hashlib
import uuid
from dotenv import load_dotenv
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

load_dotenv()

app = FastAPI(title="Kongu Polytechnic MCQ Test Platform")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "kongu_mcq_db")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Security
security = HTTPBearer()
SECRET_KEY = "kongu_polytechnic_secret_key_2025"

# Department list
DEPARTMENTS = [
    "Civil Engineering",
    "Mechanical Engineering", 
    "Electronics & Communication Engineering",
    "Computer Engineering",
    "Chemical Engineering",
    "Automobile Engineering",
    "Mechatronics Engineering",
    "Instrumentation and Control Engineering",
    "Communication and Computer Networking Engineering",
    "Basic Science"
]

# Pydantic Models
class StudentRegister(BaseModel):
    name: str
    register_number: str
    roll_number: str
    department: str
    year: int
    semester: int
    password: str

class StaffRegister(BaseModel):
    name: str
    department: str
    academic_year: str
    email: str
    password: str

class LoginRequest(BaseModel):
    identifier: str  # register_number for students, email for staff
    password: str
    user_type: str  # "student" or "staff"

class QuestionCreate(BaseModel):
    question_text: str
    options: List[str]
    correct_answer: int  # index of correct option (0-3)
    explanation: str
    subject_id: str

class SubjectCreate(BaseModel):
    name: str
    course_code: str
    department: str

class TestCreate(BaseModel):
    subject_id: str
    category: str  # "CAT" or "Mock Test"
    start_time: datetime
    end_time: datetime
    duration_minutes: int = 45

class TestAttempt(BaseModel):
    test_id: str
    student_id: str
    answers: Dict[str, int]  # question_id -> selected_option_index
    tab_switches: int
    is_malpractice: bool
    completion_time: Optional[datetime] = None

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Kongu Polytechnic MCQ Platform API"}

@app.get("/api/departments")
async def get_departments():
    return {"departments": DEPARTMENTS}

@app.post("/api/student/register")
async def register_student(student: StudentRegister):
    if student.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    # Check if student already exists
    existing = db.students.find_one({"register_number": student.register_number})
    if existing:
        raise HTTPException(status_code=400, detail="Student already exists")
    
    student_data = {
        "id": str(uuid.uuid4()),
        "name": student.name,
        "register_number": student.register_number,
        "roll_number": student.roll_number,
        "department": student.department,
        "year": student.year,
        "semester": student.semester,
        "password": hash_password(student.password),
        "created_at": datetime.utcnow()
    }
    
    db.students.insert_one(student_data)
    return {"message": "Student registered successfully", "student_id": student_data["id"]}

@app.post("/api/staff/register")
async def register_staff(staff: StaffRegister):
    if staff.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    # Check if staff already exists
    existing = db.staff.find_one({"email": staff.email})
    if existing:
        raise HTTPException(status_code=400, detail="Staff already exists")
    
    staff_data = {
        "id": str(uuid.uuid4()),
        "name": staff.name,
        "department": staff.department,
        "academic_year": staff.academic_year,
        "email": staff.email,
        "password": hash_password(staff.password),
        "created_at": datetime.utcnow()
    }
    
    db.staff.insert_one(staff_data)
    return {"message": "Staff registered successfully", "staff_id": staff_data["id"]}

@app.post("/api/login")
async def login(login_data: LoginRequest):
    if login_data.user_type == "student":
        user = db.students.find_one({"register_number": login_data.identifier})
        collection = "students"
    elif login_data.user_type == "staff":
        user = db.staff.find_one({"email": login_data.identifier})
        collection = "staff"
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    if not user or user["password"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token_data = {
        "user_id": user["id"],
        "user_type": login_data.user_type,
        "name": user["name"]
    }
    
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "type": login_data.user_type,
            "department": user["department"]
        }
    }

@app.post("/api/staff/subjects")
async def create_subject(subject: SubjectCreate, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create subjects")
    
    if subject.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    subject_data = {
        "id": str(uuid.uuid4()),
        "name": subject.name,
        "course_code": subject.course_code,
        "department": subject.department,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow()
    }
    
    db.subjects.insert_one(subject_data)
    return {"message": "Subject created successfully", "subject_id": subject_data["id"]}

@app.get("/api/subjects")
async def get_subjects(department: str = None):
    query = {}
    if department:
        query["department"] = department
    
    subjects = list(db.subjects.find(query, {"_id": 0}))
    return {"subjects": subjects}

@app.post("/api/staff/questions")
async def create_question(question: QuestionCreate, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create questions")
    
    # Verify subject exists
    subject = db.subjects.find_one({"id": question.subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    question_data = {
        "id": str(uuid.uuid4()),
        "question_text": question.question_text,
        "options": question.options,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "subject_id": question.subject_id,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow()
    }
    
    db.questions.insert_one(question_data)
    return {"message": "Question created successfully", "question_id": question_data["id"]}

@app.post("/api/staff/tests")
async def create_test(test: TestCreate, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create tests")
    
    test_data = {
        "id": str(uuid.uuid4()),
        "subject_id": test.subject_id,
        "category": test.category,
        "start_time": test.start_time,
        "end_time": test.end_time,
        "duration_minutes": test.duration_minutes,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    db.tests.insert_one(test_data)
    return {"message": "Test created successfully", "test_id": test_data["id"]}

@app.get("/api/student/available-tests")
async def get_available_tests(current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view available tests")
    
    current_time = datetime.utcnow()
    
    # Get student info to filter by department
    student = db.students.find_one({"id": current_user["user_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Find active tests for student's department
    available_tests = []
    tests = db.tests.find({
        "is_active": True,
        "start_time": {"$lte": current_time},
        "end_time": {"$gte": current_time}
    })
    
    for test in tests:
        subject = db.subjects.find_one({"id": test["subject_id"]})
        if subject and subject["department"] == student["department"]:
            available_tests.append({
                "id": test["id"],
                "subject_name": subject["name"],
                "course_code": subject["course_code"],
                "category": test["category"],
                "duration_minutes": test["duration_minutes"],
                "end_time": test["end_time"]
            })
    
    return {"tests": available_tests}

@app.get("/api/test/{test_id}/questions")
async def get_test_questions(test_id: str, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "student":
        raise HTTPException(status_code=403, detail="Only students can take tests")
    
    # Verify test exists and is active
    test = db.tests.find_one({"id": test_id, "is_active": True})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found or inactive")
    
    # Check if test is within time bounds
    current_time = datetime.utcnow()
    if current_time < test["start_time"] or current_time > test["end_time"]:
        raise HTTPException(status_code=400, detail="Test is not currently active")
    
    # Get questions for the subject (randomized order per student)
    import random
    questions = list(db.questions.find({"subject_id": test["subject_id"]}, {"_id": 0}))
    
    # Shuffle questions based on student ID for consistent randomization
    random.seed(current_user["user_id"])
    random.shuffle(questions)
    
    # Limit to 25 questions
    questions = questions[:25]
    
    # Remove correct answers and explanations from response
    for question in questions:
        del question["correct_answer"]
        del question["explanation"]
    
    return {
        "test_id": test_id,
        "questions": questions,
        "duration_minutes": test["duration_minutes"]
    }

@app.post("/api/test/submit")
async def submit_test(attempt: TestAttempt, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Calculate score
    questions = list(db.questions.find({"id": {"$in": list(attempt.answers.keys())}}))
    correct_count = 0
    
    for question in questions:
        if attempt.answers.get(question["id"]) == question["correct_answer"]:
            correct_count += 1
    
    attempt_data = {
        "id": str(uuid.uuid4()),
        "test_id": attempt.test_id,
        "student_id": current_user["user_id"],
        "answers": attempt.answers,
        "score": correct_count,
        "total_questions": len(questions),
        "tab_switches": attempt.tab_switches,
        "is_malpractice": attempt.is_malpractice,
        "completion_time": attempt.completion_time or datetime.utcnow(),
        "submitted_at": datetime.utcnow()
    }
    
    db.test_attempts.insert_one(attempt_data)
    return {
        "message": "Test submitted successfully",
        "score": correct_count,
        "total": len(questions),
        "is_malpractice": attempt.is_malpractice
    }

@app.get("/api/student/results/{attempt_id}")
async def get_test_results(attempt_id: str, current_user: dict = Depends(verify_token)):
    attempt = db.test_attempts.find_one({"id": attempt_id, "student_id": current_user["user_id"]})
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
    
    # Get questions with correct answers
    question_ids = list(attempt["answers"].keys())
    questions = list(db.questions.find({"id": {"$in": question_ids}}))
    
    results = []
    for question in questions:
        results.append({
            "question": question["question_text"],
            "options": question["options"],
            "correct_answer": question["correct_answer"],
            "student_answer": attempt["answers"].get(question["id"]),
            "explanation": question["explanation"]
        })
    
    return {
        "score": attempt["score"],
        "total": attempt["total_questions"],
        "is_malpractice": attempt["is_malpractice"],
        "tab_switches": attempt["tab_switches"],
        "results": results
    }

@app.get("/api/staff/test-results/{test_id}")
async def get_staff_test_results(test_id: str, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view test results")
    
    attempts = list(db.test_attempts.find({"test_id": test_id}))
    results = []
    
    for attempt in attempts:
        student = db.students.find_one({"id": attempt["student_id"]})
        if student:
            results.append({
                "student_name": student["name"],
                "register_number": student["register_number"],
                "department": student["department"],
                "score": attempt["score"],
                "total": attempt["total_questions"],
                "percentage": round((attempt["score"] / attempt["total_questions"]) * 100, 2),
                "is_malpractice": attempt["is_malpractice"],
                "tab_switches": attempt["tab_switches"],
                "submitted_at": attempt["submitted_at"]
            })
    
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)