import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { Textarea } from './components/ui/textarea';
import { Checkbox } from './components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { 
  GraduationCap, Clock, Users, BookOpen, AlertTriangle, CheckCircle, XCircle, 
  Plus, Eye, BarChart3, Mail, Calendar, Timer, LiveIcon, TrendingUp, PieChart,
  FileText, Target, Award, Activity, MessageSquare, Settings, Trash2, Edit
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Proctoring Hook (unchanged)
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

// Timer Hook (unchanged)
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

// Login Component (updated with email field)
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

// Enhanced Student Dashboard
const StudentDashboard = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [availableTests, setAvailableTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('tests');
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
            <p className="text-gray-600 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user?.email} • {user?.department} • Year {user?.year || 'N/A'}
            </p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="tests">Available Tests</TabsTrigger>
            <TabsTrigger value="insights">My Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Available Tests
                </CardTitle>
                <CardDescription>Tests assigned for your department and year</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading tests...</div>
                ) : availableTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No tests available at the moment</p>
                    <p className="text-sm">Check back later for new assignments</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {availableTests.map((test) => (
                      <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{test.subject_name}</h3>
                            <p className="text-sm text-gray-600">{test.course_code}</p>
                          </div>
                          <Badge variant={test.category === 'CAT' ? 'default' : 'secondary'}>
                            {test.category}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {test.duration_minutes} minutes
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Year {test.target_year}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Ends: {new Date(test.end_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            {new Date(test.end_date).toLocaleTimeString()}
                          </span>
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
          </TabsContent>

          <TabsContent value="insights">
            <StudentInsights />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Student Insights Component
const StudentInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This would fetch student's test history and insights
    // For now, showing placeholder
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Insights
        </CardTitle>
        <CardDescription>Your test performance and unit-wise analysis</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading insights...</div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Complete some tests to see your performance insights</p>
            <p className="text-sm">Unit-wise analysis will appear here after test completion</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced Staff Dashboard
const StaffDashboard = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Staff Dashboard</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user?.email} • {user?.department}
            </p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="tests">Create Tests</TabsTrigger>
            <TabsTrigger value="insights">Test Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StaffOverview />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionBank />
          </TabsContent>

          <TabsContent value="tests">
            <CreateTests />
          </TabsContent>

          <TabsContent value="insights">
            <StaffInsights />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Staff Overview Component
const StaffOverview = () => {
  const [stats, setStats] = useState({ subjects: 0, questions: 0, tests: 0, students: 0 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-6 text-center">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-fit mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{stats.subjects}</h3>
          <p className="text-gray-600">Subjects</p>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-6 text-center">
          <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full w-fit mx-auto mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{stats.questions}</h3>
          <p className="text-gray-600">Questions</p>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-6 text-center">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full w-fit mx-auto mb-4">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{stats.tests}</h3>
          <p className="text-gray-600">Active Tests</p>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-6 text-center">
          <div className="p-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-full w-fit mx-auto mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{stats.students}</h3>
          <p className="text-gray-600">Students</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Question Bank Component
const QuestionBank = () => {
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [units] = useState(['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5']);

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    subject_id: '',
    units: []
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.question_text || !newQuestion.subject_id || newQuestion.units.length === 0) {
      alert('Please fill all required fields and select at least one unit');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQuestion)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewQuestion({
          question_text: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          explanation: '',
          subject_id: '',
          units: []
        });
        alert('Question created successfully!');
      } else {
        const error = await response.json();
        alert('Error: ' + error.detail);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleUnitToggle = (unit) => {
    const newUnits = newQuestion.units.includes(unit)
      ? newQuestion.units.filter(u => u !== unit)
      : [...newQuestion.units, unit];
    setNewQuestion({ ...newQuestion, units: newUnits });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Question Bank Management
              </CardTitle>
              <CardDescription>Create and manage MCQ questions with units</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Question</DialogTitle>
                  <DialogDescription>
                    Add a new MCQ question to your question bank
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={newQuestion.subject_id}
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, subject_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.course_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Units (Select all applicable)</Label>
                    <div className="flex flex-wrap gap-2">
                      {units.map((unit) => (
                        <div key={unit} className="flex items-center space-x-2">
                          <Checkbox
                            id={unit}
                            checked={newQuestion.units.includes(unit)}
                            onCheckedChange={() => handleUnitToggle(unit)}
                          />
                          <Label htmlFor={unit} className="text-sm">{unit}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      placeholder="Enter your question here..."
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Options</Label>
                    {newQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="correct_answer"
                            checked={newQuestion.correct_answer === index}
                            onChange={() => setNewQuestion({ ...newQuestion, correct_answer: index })}
                            className="mr-2"
                          />
                          <Label className="text-sm">Option {index + 1}</Label>
                        </div>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <Textarea
                      placeholder="Explain why this is the correct answer..."
                      value={newQuestion.explanation}
                      onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateQuestion}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      {loading ? 'Creating...' : 'Create Question'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Start building your question bank</p>
            <p className="text-sm">Click "Add Question" to create your first MCQ with unit classification</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Create Tests Component
const CreateTests = () => {
  const [subjects, setSubjects] = useState([]);
  const [tests, setTests] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLiveStatus, setShowLiveStatus] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [liveStudents, setLiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newTest, setNewTest] = useState({
    subject_id: '',
    category: 'CAT',
    start_date: '',
    end_date: '',
    duration_minutes: 45,
    target_year: 1,
    target_semester: 1
  });

  useEffect(() => {
    fetchSubjects();
    fetchTests();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const handleCreateTest = async () => {
    if (!newTest.subject_id || !newTest.start_date || !newTest.end_date) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTest,
          start_date: new Date(newTest.start_date).toISOString(),
          end_date: new Date(newTest.end_date).toISOString()
        })
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewTest({
          subject_id: '',
          category: 'CAT',
          start_date: '',
          end_date: '',
          duration_minutes: 45,
          target_year: 1,
          target_semester: 1
        });
        fetchTests();
        alert('Test created successfully!');
      } else {
        const error = await response.json();
        alert('Error: ' + error.detail);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showLiveStatusModal = async (testId) => {
    setSelectedTestId(testId);
    setShowLiveStatus(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/live-status/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLiveStudents(data.live_students || []);
    } catch (error) {
      console.error('Error fetching live status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Test Management
              </CardTitle>
              <CardDescription>Create and schedule tests for students</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Test</DialogTitle>
                  <DialogDescription>
                    Schedule a new test for students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={newTest.subject_id}
                      onValueChange={(value) => setNewTest({ ...newTest, subject_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.course_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTest.category}
                      onValueChange={(value) => setNewTest({ ...newTest, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAT">CAT (Internal)</SelectItem>
                        <SelectItem value="Mock Test">Mock Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Year</Label>
                      <Select
                        value={newTest.target_year.toString()}
                        onValueChange={(value) => setNewTest({ ...newTest, target_year: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Semester</Label>
                      <Select
                        value={newTest.target_semester.toString()}
                        onValueChange={(value) => setNewTest({ ...newTest, target_semester: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6].map(sem => (
                            <SelectItem key={sem} value={sem.toString()}>{sem}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newTest.duration_minutes}
                      onChange={(e) => setNewTest({ ...newTest, duration_minutes: parseInt(e.target.value) })}
                      min="15"
                      max="180"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={newTest.start_date}
                      onChange={(e) => setNewTest({ ...newTest, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={newTest.end_date}
                      onChange={(e) => setNewTest({ ...newTest, end_date: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTest}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {loading ? 'Creating...' : 'Create Test'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No tests created yet</p>
              <p className="text-sm">Create your first test to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{test.subject_name}</h3>
                      <p className="text-sm text-gray-600">{test.course_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={test.category === 'CAT' ? 'default' : 'secondary'}>
                        {test.category}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showLiveStatusModal(test.id)}
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        Live Status
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <span>Duration: {test.duration_minutes}min</span>
                    <span>Year: {test.target_year}</span>
                    <span>Start: {new Date(test.start_date).toLocaleDateString()}</span>
                    <span>End: {new Date(test.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Status Modal */}
      <Dialog open={showLiveStatus} onOpenChange={setShowLiveStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Test Status
            </DialogTitle>
            <DialogDescription>
              Students currently taking this test
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {liveStudents.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No students currently taking this test</p>
            ) : (
              <div className="space-y-2">
                {liveStudents.map((student, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-gray-600">{student.register_number}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{student.status}</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {new Date(student.start_time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Staff Insights Component
const StaffInsights = () => {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const fetchInsights = async (testId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/staff/test-insights/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelect = (testId) => {
    setSelectedTest(testId);
    if (testId) {
      fetchInsights(testId);
    } else {
      setInsights(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Test Analytics & Insights
          </CardTitle>
          <CardDescription>Detailed performance analysis with unit-wise breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Test</Label>
              <Select value={selectedTest} onValueChange={handleTestSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.subject_name} - {test.category} (Year {test.target_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="text-center py-8">Loading insights...</div>
            )}

            {insights && !loading && (
              <div className="space-y-6">
                {/* Overall Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h3 className="text-2xl font-bold text-blue-600">{insights.total_attempts}</h3>
                      <p className="text-sm text-gray-600">Total Attempts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h3 className="text-2xl font-bold text-green-600">{insights.average_percentage}%</h3>
                      <p className="text-sm text-gray-600">Average Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <h3 className="text-2xl font-bold text-red-600">{insights.malpractice_count}</h3>
                      <p className="text-sm text-gray-600">Malpractice Cases</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Unit-wise Performance */}
                {Object.keys(insights.unit_insights || {}).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Unit-wise Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(insights.unit_insights).map(([unit, data]) => (
                          <div key={unit} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{unit}</span>
                              <span className="text-sm text-gray-600">
                                {data.average_percentage}% ({data.total_attempts} attempts)
                              </span>
                            </div>
                            <Progress value={data.average_percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {!selectedTest && !loading && (
              <div className="text-center py-8 text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a test to view detailed insights</p>
                <p className="text-sm">Unit-wise performance analysis will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Test Interface Component (unchanged from previous implementation)
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
            isMalpractice: data.is_malpractice,
            attemptId: data.attempt_id
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

// Registration Component (updated with email field)
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
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  onChange={(e) => handleInputChange('email', e.target.value)}
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
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    placeholder="e.g., 2025-2026"
                    onChange={(e) => handleInputChange('academic_year', e.target.value)}
                    required
                  />
                </div>
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

// Test Completed Component (updated)
const TestCompleted = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { score, total, isMalpractice, attemptId } = state || {};

  const viewDetailedResults = () => {
    if (attemptId) {
      navigate(`/test-results/${attemptId}`);
    }
  };

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
              <div className="flex items-center justify-center gap-2 mb-4">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Email notification sent</span>
              </div>
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

          <div className="space-y-3">
            {attemptId && (
              <Button 
                onClick={viewDetailedResults}
                variant="outline"
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Results & Insights
              </Button>
            )}
            <Button 
              onClick={() => navigate('/student-dashboard')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Test Results Component
const TestResults = () => {
  const { attemptId } = useParams();
  const [results, setResults] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
    fetchInsights();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/student/results/${attemptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/student/test-insights/${attemptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Test Results & Insights</h1>
            <Button onClick={() => navigate('/student-dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>

          {/* Performance Overview */}
          {insights && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-blue-600">{insights.overall_score}</h3>
                    <p className="text-sm text-gray-600">Questions Correct</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-green-600">{insights.overall_percentage}%</h3>
                    <p className="text-sm text-gray-600">Overall Score</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-purple-600">{Object.keys(insights.unit_insights || {}).length}</h3>
                    <p className="text-sm text-gray-600">Units Covered</p>
                  </div>
                </div>

                {/* Unit-wise Performance */}
                {Object.keys(insights.unit_insights || {}).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-4">Unit-wise Performance</h4>
                    <div className="space-y-3">
                      {Object.entries(insights.unit_insights).map(([unit, data]) => (
                        <div key={unit} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{unit}</span>
                            <span className="text-sm text-gray-600">
                              {data.correct}/{data.total} ({data.percentage}%)
                            </span>
                          </div>
                          <Progress value={data.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detailed Question Results */}
          {results && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Question-wise Analysis
                </CardTitle>
                <CardDescription>
                  Review each question with correct answers and explanations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {results.results?.map((result, index) => (
                    <div key={index} className="border-l-4 border-l-blue-200 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Question {index + 1}</span>
                        {result.student_answer === result.correct_answer ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {result.units && result.units.length > 0 && (
                          <div className="flex gap-1">
                            {result.units.map((unit) => (
                              <Badge key={unit} variant="secondary" className="text-xs">
                                {unit}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-800 mb-3">{result.question}</p>
                      
                      <div className="space-y-2 mb-3">
                        {result.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded border ${
                              optIndex === result.correct_answer
                                ? 'bg-green-50 border-green-200'
                                : optIndex === result.student_answer
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {optIndex === result.correct_answer && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {optIndex === result.student_answer && optIndex !== result.correct_answer && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span>{option}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {result.explanation && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Explanation:</strong> {result.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
            <Route path="/test-results/:attemptId" element={<ProtectedRoute userType="student"><TestResults /></ProtectedRoute>} />
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

export default App;