import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Progress } from './components/ui/progress';
import { Separator } from './components/ui/separator';
import { GraduationCap, Clock, Users, BookOpen, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Proctoring Hook
const useProctoring = (isActive, onViolation) => {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isTestSuspended, setIsTestSuspended] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let isVisible = true;

    const handleVisibilityChange = () => {
      if (document.hidden && isVisible && !isTestSuspended) {
        isVisible = false;
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        
        if (newCount >= 3) {
          setIsTestSuspended(true);
          onViolation(newCount, true);
        } else {
          onViolation(newCount, false);
        }
      } else if (!document.hidden) {
        isVisible = true;
      }
    };

    const handleBlur = () => {
      if (isVisible && !isTestSuspended) {
        isVisible = false;
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        
        if (newCount >= 3) {
          setIsTestSuspended(true);
          onViolation(newCount, true);
        } else {
          onViolation(newCount, false);
        }
      }
    };

    const handleFocus = () => {
      isVisible = true;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isActive, tabSwitches, isTestSuspended, onViolation]);

  return { tabSwitches, isTestSuspended };
};

// Timer Hook
const useTimer = (initialMinutes, onTimeUp) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      onTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeUp]);

  const startTimer = () => setIsActive(true);
  const pauseTimer = () => setIsActive(false);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return { timeLeft, formatTime: formatTime(timeLeft), startTimer, pauseTimer, isActive };
};

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
      }
    }
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [userType, setUserType] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, user_type: userType })
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.access_token);
        navigate(userType === 'student' ? '/student-dashboard' : '/staff-dashboard');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Kongu Polytechnic College
          </CardTitle>
          <CardDescription className="text-gray-600">
            MCQ Test Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={userType} onValueChange={setUserType} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="student" className="data-[state=active]:bg-blue-500">Student</TabsTrigger>
              <TabsTrigger value="staff" className="data-[state=active]:bg-indigo-500">Staff</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {userType === 'student' ? 'Register Number' : 'Email'}
                </Label>
                <Input
                  id="identifier"
                  type={userType === 'student' ? 'text' : 'email'}
                  placeholder={userType === 'student' ? 'Enter register number' : 'Enter email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Tabs>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Register here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Student Dashboard
const StudentDashboard = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [availableTests, setAvailableTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableTests();
  }, []);

  const fetchAvailableTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/student/available-tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAvailableTests(data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.name}</h1>
            <p className="text-gray-600">{user?.department}</p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Available Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading tests...</div>
            ) : availableTests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tests available at the moment
              </div>
            ) : (
              <div className="grid gap-4">
                {availableTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{test.subject_name}</h3>
                        <p className="text-sm text-gray-600">{test.course_code}</p>
                      </div>
                      <Badge variant={test.category === 'CAT' ? 'default' : 'secondary'}>
                        {test.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {test.duration_minutes} minutes
                      </span>
                      <span>Ends: {new Date(test.end_time).toLocaleString()}</span>
                    </div>
                    <Button 
                      onClick={() => startTest(test.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Start Test
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Test Interface Component
const TestInterface = () => {
  const { testId } = useParams();
  const { user } = React.useContext(AuthContext);
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testDuration, setTestDuration] = useState(45);
  
  const handleViolation = (tabSwitchCount, isSuspended) => {
    if (isSuspended) {
      alert('Test suspended due to malpractice! Your test will be automatically submitted.');
      submitTest(true, tabSwitchCount);
    } else {
      alert(`Warning: Tab switch detected! (${tabSwitchCount}/3) - Test will be suspended on next violation.`);
    }
  };

  const { tabSwitches, isTestSuspended } = useProctoring(true, handleViolation);
  
  const handleTimeUp = () => {
    alert('Time is up! Submitting your test automatically.');
    submitTest(false, tabSwitches);
  };

  const { timeLeft, formatTime, startTimer } = useTimer(testDuration, handleTimeUp);

  useEffect(() => {
    fetchTestQuestions();
  }, [testId]);

  useEffect(() => {
    if (questions.length > 0) {
      startTimer();
    }
  }, [questions]);

  const fetchTestQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/test/${testId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setQuestions(data.questions || []);
      setTestDuration(data.duration_minutes || 45);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    if (isTestSuspended) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitTest = async (isMalpractice = false, finalTabSwitches = tabSwitches) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/test/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_id: testId,
          student_id: user.id,
          answers,
          tab_switches: finalTabSwitches,
          is_malpractice: isMalpractice || isTestSuspended,
          completion_time: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        navigate('/test-completed', { 
          state: { 
            score: data.score, 
            total: data.total, 
            isMalpractice: data.is_malpractice 
          } 
        });
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading test questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
            <p className="text-gray-600">This test has no questions or has expired.</p>
            <Button onClick={() => navigate('/student-dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Test Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant={isTestSuspended ? "destructive" : "default"}>
                {isTestSuspended ? "SUSPENDED" : "IN PROGRESS"}
              </Badge>
              <span className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Tab switches: {tabSwitches}/3</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className={timeLeft < 300 ? 'text-red-600 font-bold' : 'text-blue-600'}>
                  {formatTime}
                </span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-2" />
        </div>
      </div>

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-6 leading-relaxed">
                {currentQ.question_text}
              </h2>
              
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                      answers[currentQ.id] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${isTestSuspended ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleAnswerSelect(currentQ.id, index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQ.id] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === index && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0 || isTestSuspended}
              >
                Previous
              </Button>

              <div className="text-sm text-gray-600">
                Answered: {Object.keys(answers).length}/{questions.length}
              </div>

              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={() => submitTest()}
                  disabled={submitting || isTestSuspended}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  disabled={isTestSuspended}
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Navigation */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
        <Card className="bg-white/90 backdrop-blur-lg border-0 shadow-xl">
          <CardContent className="p-4">
            <div className="flex gap-2 max-w-sm overflow-x-auto">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  disabled={isTestSuspended}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    currentQuestion === index
                      ? 'bg-blue-600 text-white'
                      : answers[questions[index].id] !== undefined
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  } ${isTestSuspended ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Staff Dashboard Component
const StaffDashboard = () => {
  const { user, logout } = React.useContext(AuthContext);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Staff Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name} - {user?.department}</p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg hover:shadow-2xl transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-fit mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Subjects</h3>
              <p className="text-gray-600 mb-4">Add and manage subjects for your department</p>
              <Button className="w-full">Manage Subjects</Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg hover:shadow-2xl transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Question Bank</h3>
              <p className="text-gray-600 mb-4">Create and manage MCQ questions</p>
              <Button className="w-full bg-green-600 hover:bg-green-700">Add Questions</Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg hover:shadow-2xl transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full w-fit mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Tests</h3>
              <p className="text-gray-600 mb-4">Schedule CAT and Mock tests</p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Schedule Test</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Registration Component
const Registration = () => {
  const [userType, setUserType] = useState('student');
  const [formData, setFormData] = useState({});
  const [departments] = useState([
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
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = userType === 'student' ? '/api/student/register' : '/api/staff/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! Please login.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.detail || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Register</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={userType} onValueChange={setUserType}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Common Fields */}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Enter full name"
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Specific Fields */}
              {userType === 'student' && (
                <>
                  <div className="space-y-2">
                    <Label>Register Number</Label>
                    <Input
                      placeholder="Enter register number"
                      onChange={(e) => handleInputChange('register_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input
                      placeholder="Enter roll number"
                      onChange={(e) => handleInputChange('roll_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select onValueChange={(value) => handleInputChange('year', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Semester</Label>
                      <Select onValueChange={(value) => handleInputChange('semester', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6].map(sem => (
                            <SelectItem key={sem} value={sem.toString()}>{sem}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Staff Specific Fields */}
              {userType === 'staff' && (
                <>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter email"
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      placeholder="e.g., 2025-2026"
                      onChange={(e) => handleInputChange('academic_year', e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Tabs>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Already have an account? Login here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Test Completed Component
const TestCompleted = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { score, total, isMalpractice } = state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <Card className="max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="text-center py-8">
          {isMalpractice ? (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">Test Suspended</h2>
              <p className="text-gray-600 mb-4">
                Your test was suspended due to malpractice detection.
              </p>
              <Badge variant="destructive" className="mb-4">Malpractice Detected</Badge>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Test Completed!</h2>
              <p className="text-gray-600 mb-4">Your test has been submitted successfully.</p>
            </>
          )}
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Score</h3>
            <div className="text-3xl font-bold text-blue-600">
              {score || 0} / {total || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {total ? Math.round((score / total) * 100) : 0}% Correct
            </p>
          </div>

          <Button 
            onClick={() => navigate('/student-dashboard')}
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Registration />} />
            <Route path="/student-dashboard" element={<ProtectedRoute userType="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/staff-dashboard" element={<ProtectedRoute userType="staff"><StaffDashboard /></ProtectedRoute>} />
            <Route path="/test/:testId" element={<ProtectedRoute userType="student"><TestInterface /></ProtectedRoute>} />
            <Route path="/test-completed" element={<ProtectedRoute userType="student"><TestCompleted /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children, userType }) => {
  const { user, token } = React.useContext(AuthContext);
  
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }
  
  if (userType && user.type !== userType) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Import useParams and useLocation
import { useParams, useLocation } from 'react-router-dom';

export default App;