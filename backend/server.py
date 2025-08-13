from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from pydantic import BaseModel, Field, EmailStr
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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from collections import defaultdict

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

# Email configuration (blank for now)
GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL", "")
GMAIL_PASSWORD = os.environ.get("GMAIL_PASSWORD", "")

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

# Units list
UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"]

# Pydantic Models
class StudentRegister(BaseModel):
    name: str
    register_number: str
    roll_number: str
    department: str
    year: int
    semester: int
    email: EmailStr
    password: str

class StaffRegister(BaseModel):
    name: str
    department: str
    academic_year: str
    email: EmailStr
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
    units: List[str]  # Selected units from UNITS list

class SubjectCreate(BaseModel):
    name: str
    course_code: str
    department: str

class TestCreate(BaseModel):
    subject_id: str
    category: str  # "CAT" or "Mock Test"
    start_date: datetime
    end_date: datetime
    duration_minutes: int
    target_year: int
    target_semester: int

class TestAttempt(BaseModel):
    test_id: str
    student_id: str
    answers: Dict[str, int]  # question_id -> selected_option_index
    tab_switches: int
    is_malpractice: bool
    completion_time: Optional[datetime] = None

# In-memory storage for live test sessions
live_sessions = {}  # test_id -> {student_id: {start_time, current_question, etc}}

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

async def send_email(to_email: str, subject: str, body: str):
    """Send email using Gmail SMTP"""
    if not GMAIL_EMAIL or not GMAIL_PASSWORD:
        print("Email configuration not set up")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = GMAIL_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(GMAIL_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Kongu Polytechnic MCQ Platform API"}

@app.get("/api/departments")
async def get_departments():
    return {"departments": DEPARTMENTS}

@app.get("/api/units")
async def get_units():
    return {"units": UNITS}

@app.post("/api/student/register")
async def register_student(student: StudentRegister):
    if student.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    # Check if student already exists
    existing = db.students.find_one({
        "$or": [
            {"register_number": student.register_number},
            {"email": student.email}
        ]
    })
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
        "email": student.email,
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
        "name": user["name"],
        "email": user["email"]
    }
    
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "type": login_data.user_type,
            "department": user["department"],
            "email": user["email"]
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
async def get_subjects(department: str = None, current_user: dict = Depends(verify_token)):
    query = {}
    if current_user["user_type"] == "staff":
        # Staff sees subjects from their department
        staff = db.staff.find_one({"id": current_user["user_id"]})
        if staff:
            query["department"] = staff["department"]
    elif department:
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
    
    # Validate units
    for unit in question.units:
        if unit not in UNITS:
            raise HTTPException(status_code=400, detail=f"Invalid unit: {unit}")
    
    question_data = {
        "id": str(uuid.uuid4()),
        "question_text": question.question_text,
        "options": question.options,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "subject_id": question.subject_id,
        "units": question.units,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow()
    }
    
    db.questions.insert_one(question_data)
    return {"message": "Question created successfully", "question_id": question_data["id"]}

@app.get("/api/staff/questions")
async def get_staff_questions(subject_id: str = None, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view questions")
    
    query = {"created_by": current_user["user_id"]}
    if subject_id:
        query["subject_id"] = subject_id
    
    questions = list(db.questions.find(query, {"_id": 0}))
    return {"questions": questions}

@app.post("/api/staff/tests")
async def create_test(test: TestCreate, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can create tests")
    
    # Verify subject exists and belongs to staff's department
    subject = db.subjects.find_one({"id": test.subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    staff = db.staff.find_one({"id": current_user["user_id"]})
    if subject["department"] != staff["department"]:
        raise HTTPException(status_code=403, detail="Can only create tests for your department")
    
    test_data = {
        "id": str(uuid.uuid4()),
        "subject_id": test.subject_id,
        "category": test.category,
        "start_date": test.start_date,
        "end_date": test.end_date,
        "duration_minutes": test.duration_minutes,
        "target_year": test.target_year,
        "target_semester": test.target_semester,
        "department": subject["department"],
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
    
    # Get student info to filter by department and year
    student = db.students.find_one({"id": current_user["user_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Find active tests for student's department and year
    available_tests = []
    tests = db.tests.find({
        "is_active": True,
        "start_date": {"$lte": current_time},
        "end_date": {"$gte": current_time},
        "department": student["department"],
        "target_year": student["year"]
    })
    
    for test in tests:
        subject = db.subjects.find_one({"id": test["subject_id"]})
        if subject:
            available_tests.append({
                "id": test["id"],
                "subject_name": subject["name"],
                "course_code": subject["course_code"],
                "category": test["category"],
                "duration_minutes": test["duration_minutes"],
                "end_date": test["end_date"],
                "target_year": test["target_year"],
                "target_semester": test["target_semester"]
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
    if current_time < test["start_date"] or current_time > test["end_date"]:
        raise HTTPException(status_code=400, detail="Test is not currently active")
    
    # Verify student is eligible (department and year match)
    student = db.students.find_one({"id": current_user["user_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student["department"] != test["department"] or student["year"] != test["target_year"]:
        raise HTTPException(status_code=403, detail="You are not eligible for this test")
    
    # Track live session
    if test_id not in live_sessions:
        live_sessions[test_id] = {}
    
    live_sessions[test_id][current_user["user_id"]] = {
        "student_name": student["name"],
        "register_number": student["register_number"],
        "start_time": datetime.utcnow(),
        "current_question": 0,
        "status": "active"
    }
    
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
    
    # Calculate score and unit-wise performance
    questions = list(db.questions.find({"id": {"$in": list(attempt.answers.keys())}}))
    correct_count = 0
    unit_performance = defaultdict(lambda: {"correct": 0, "total": 0})
    
    for question in questions:
        is_correct = attempt.answers.get(question["id"]) == question["correct_answer"]
        if is_correct:
            correct_count += 1
        
        # Track unit-wise performance
        for unit in question.get("units", []):
            unit_performance[unit]["total"] += 1
            if is_correct:
                unit_performance[unit]["correct"] += 1
    
    attempt_data = {
        "id": str(uuid.uuid4()),
        "test_id": attempt.test_id,
        "student_id": current_user["user_id"],
        "answers": attempt.answers,
        "score": correct_count,
        "total_questions": len(questions),
        "tab_switches": attempt.tab_switches,
        "is_malpractice": attempt.is_malpractice,
        "unit_performance": dict(unit_performance),
        "completion_time": attempt.completion_time or datetime.utcnow(),
        "submitted_at": datetime.utcnow()
    }
    
    db.test_attempts.insert_one(attempt_data)
    
    # Remove from live sessions
    if attempt.test_id in live_sessions and current_user["user_id"] in live_sessions[attempt.test_id]:
        del live_sessions[attempt.test_id][current_user["user_id"]]
    
    # Send email notification
    student = db.students.find_one({"id": current_user["user_id"]})
    if student and student.get("email"):
        test = db.tests.find_one({"id": attempt.test_id})
        subject_obj = db.subjects.find_one({"id": test["subject_id"]}) if test else None
        
        email_subject = f"Test Completed - {subject_obj['name'] if subject_obj else 'MCQ Test'}"
        email_body = f"""
        <html>
        <body>
            <h2>Kongu Polytechnic College - Test Completion Notice</h2>
            <p>Dear {student['name']},</p>
            <p>You have successfully completed your test.</p>
            
            <h3>Test Details:</h3>
            <ul>
                <li><strong>Subject:</strong> {subject_obj['name'] if subject_obj else 'N/A'}</li>
                <li><strong>Score:</strong> {correct_count}/{len(questions)} ({round((correct_count/len(questions))*100, 2)}%)</li>
                <li><strong>Status:</strong> {'Malpractice Detected' if attempt.is_malpractice else 'Completed Successfully'}</li>
                <li><strong>Submitted At:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</li>
            </ul>
            
            <p>You can view detailed results and insights in your student portal.</p>
            
            <p>Best regards,<br>Kongu Polytechnic College</p>
        </body>
        </html>
        """
        
        await send_email(student["email"], email_subject, email_body)
    
    return {
        "message": "Test submitted successfully",
        "score": correct_count,
        "total": len(questions),
        "is_malpractice": attempt.is_malpractice,
        "attempt_id": attempt_data["id"]
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
            "explanation": question["explanation"],
            "units": question.get("units", [])
        })
    
    return {
        "score": attempt["score"],
        "total": attempt["total_questions"],
        "percentage": round((attempt["score"] / attempt["total_questions"]) * 100, 2),
        "is_malpractice": attempt["is_malpractice"],
        "tab_switches": attempt["tab_switches"],
        "unit_performance": attempt.get("unit_performance", {}),
        "results": results,
        "submitted_at": attempt["submitted_at"]
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
                "email": student["email"],
                "department": student["department"],
                "year": student["year"],
                "score": attempt["score"],
                "total": attempt["total_questions"],
                "percentage": round((attempt["score"] / attempt["total_questions"]) * 100, 2),
                "is_malpractice": attempt["is_malpractice"],
                "tab_switches": attempt["tab_switches"],
                "unit_performance": attempt.get("unit_performance", {}),
                "submitted_at": attempt["submitted_at"]
            })
    
    return {"results": results}

@app.get("/api/staff/live-status/{test_id}")
async def get_live_test_status(test_id: str, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view live status")
    
    live_students = live_sessions.get(test_id, {})
    return {"live_students": list(live_students.values())}

@app.get("/api/staff/test-insights/{test_id}")
async def get_test_insights(test_id: str, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view test insights")
    
    attempts = list(db.test_attempts.find({"test_id": test_id}))
    
    if not attempts:
        return {"message": "No attempts found for this test"}
    
    # Overall statistics
    total_attempts = len(attempts)
    total_score = sum(attempt["score"] for attempt in attempts)
    average_score = total_score / total_attempts
    malpractice_count = sum(1 for attempt in attempts if attempt["is_malpractice"])
    
    # Unit-wise performance
    unit_stats = defaultdict(lambda: {"total_questions": 0, "correct_answers": 0, "attempts": 0})
    
    for attempt in attempts:
        unit_perf = attempt.get("unit_performance", {})
        for unit, perf in unit_perf.items():
            unit_stats[unit]["total_questions"] += perf["total"]
            unit_stats[unit]["correct_answers"] += perf["correct"]
            unit_stats[unit]["attempts"] += 1
    
    # Calculate unit-wise percentages
    unit_insights = {}
    for unit, stats in unit_stats.items():
        if stats["total_questions"] > 0:
            unit_insights[unit] = {
                "average_percentage": round((stats["correct_answers"] / stats["total_questions"]) * 100, 2),
                "total_questions": stats["total_questions"],
                "total_attempts": stats["attempts"]
            }
    
    return {
        "total_attempts": total_attempts,
        "average_score": round(average_score, 2),
        "average_percentage": round((average_score / attempts[0]["total_questions"]) * 100, 2),
        "malpractice_count": malpractice_count,
        "malpractice_percentage": round((malpractice_count / total_attempts) * 100, 2),
        "unit_insights": unit_insights
    }

@app.get("/api/student/test-insights/{attempt_id}")
async def get_student_test_insights(attempt_id: str, current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view their insights")
    
    attempt = db.test_attempts.find_one({"id": attempt_id, "student_id": current_user["user_id"]})
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
    
    unit_performance = attempt.get("unit_performance", {})
    unit_insights = {}
    
    for unit, perf in unit_performance.items():
        if perf["total"] > 0:
            unit_insights[unit] = {
                "correct": perf["correct"],
                "total": perf["total"],
                "percentage": round((perf["correct"] / perf["total"]) * 100, 2)
            }
    
    return {
        "overall_score": attempt["score"],
        "total_questions": attempt["total_questions"],
        "overall_percentage": round((attempt["score"] / attempt["total_questions"]) * 100, 2),
        "unit_insights": unit_insights,
        "is_malpractice": attempt["is_malpractice"],
        "submitted_at": attempt["submitted_at"]
    }

@app.get("/api/staff/tests")
async def get_staff_tests(current_user: dict = Depends(verify_token)):
    if current_user["user_type"] != "staff":
        raise HTTPException(status_code=403, detail="Only staff can view their tests")
    
    tests = list(db.tests.find({"created_by": current_user["user_id"]}, {"_id": 0}))
    
    for test in tests:
        subject = db.subjects.find_one({"id": test["subject_id"]})
        if subject:
            test["subject_name"] = subject["name"]
            test["course_code"] = subject["course_code"]
    
    return {"tests": tests}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)