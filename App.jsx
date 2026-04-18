const { useState, useEffect, useMemo } = React;

// ─── EmailJS Configuration ───
const EMAILJS_PUBLIC_KEY = 'WQkA_dBYiZ5PcG1Kg';
const EMAILJS_SERVICE_ID = 'service_txoqf6p';
const EMAILJS_TEMPLATE_ID = 'template_s76b1xr';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

const INITIAL_USERS = [
  { id: '96714', name: 'K. Tulasidhar', role: 'DGM-I/c', level: 1, password: 'DT@123', requiresPasswordChange: true, email: 'tulasidhar@meconlimited.co.in' },
  { id: 'C8642', name: 'Sudhanshu Ranjan', role: 'Deputy Manager', level: 2, password: 'DT@123', requiresPasswordChange: true, email: 'sudhanshu@meconlimited.co.in' },
  { id: 'D1668', name: 'Rachit Bundiwal', role: 'Assistant Manager', level: 3, password: 'DT@123', requiresPasswordChange: true, email: 'rachit@meconlimited.co.in' }
];

// Simple SVG Icons
const Icons = {
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  LogOut: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Download: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
};

function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('dt_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [authError, setAuthError] = useState('');

  const [changeOldPw, setChangeOldPw] = useState('');
  const [changeNewPw, setChangeNewPw] = useState('');
  const [changeConfirmPw, setChangeConfirmPw] = useState('');

  // OTP Forgot Password state
  const [forgotStep, setForgotStep] = useState(1); // 1=select user, 2=enter OTP, 3=set new password
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSuccess, setOtpSuccess] = useState('');

  // Firebase Realtime Subscriptions
  useEffect(() => {
    const unsubscribeUsers = db.collection('dt_users').onSnapshot(snap => {
      if (snap.empty) {
        INITIAL_USERS.forEach(u => {
          db.collection('dt_users').doc(u.id).set(u);
        });
      } else {
        const uList = [];
        snap.forEach(doc => uList.push(doc.data()));
        setUsers(uList);

        // One-time migration: patch missing email fields into existing users
        uList.forEach(u => {
          if (!u.email) {
            const initial = INITIAL_USERS.find(iu => iu.id === u.id);
            if (initial && initial.email) {
              db.collection('dt_users').doc(u.id).update({ email: initial.email });
            }
          }
        });
      }
    });

    const unsubscribeTasks = db.collection('dt_tasks').onSnapshot(snap => {
      const tList = [];
      snap.forEach(doc => tList.push({ ...doc.data(), id: doc.id }));
      setTasks(tList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('dt_current_user', JSON.stringify(currentUser));
      if (currentUser.requiresPasswordChange) {
        setView('forcePasswordChange');
      } else {
        setView('dashboard');
      }
    } else {
      sessionStorage.removeItem('dt_current_user');
      setView('login');
    }
  }, [currentUser]);

  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted) {
        const saved = sessionStorage.getItem('dt_current_user');
        if (!saved) {
          setCurrentUser(null);
          setView('login');
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const maskEmail = (email) => {
    if (!email) return '***';
    const [user, domain] = email.split('@');
    const masked = user.slice(0, 2) + '***' + user.slice(-1);
    return masked + '@' + domain;
  };

  const handleSendOTP = async () => {
    setAuthError('');
    setOtpSuccess('');
    if (!loginId) {
      setAuthError('Please select a user first');
      return;
    }
    const user = users.find(u => u.id === loginId);
    if (!user || !user.email) {
      setAuthError('No email configured for this user. Contact admin.');
      return;
    }

    setOtpSending(true);
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    try {
      // Store OTP in Firestore
      await db.collection('dt_otp').doc(loginId).set({
        otp: otp,
        expiresAt: expiresAt,
        attempts: 0
      });

      // Send OTP via EmailJS
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name: user.name,
        to_email: user.email,
        otp_code: otp,
        app_name: 'DT To-Do System'
      });

      setOtpSending(false);
      setOtpTimer(120); // 2-minute resend cooldown
      setForgotStep(2);
      setOtpSuccess('OTP sent to ' + maskEmail(user.email));
    } catch (err) {
      setOtpSending(false);
      console.error('OTP send error:', err);
      setAuthError('Failed to send OTP. Please check EmailJS configuration or try again.');
    }
  };

  const handleVerifyOTP = async () => {
    setAuthError('');
    setOtpSuccess('');
    if (otpValue.length !== 6) {
      setAuthError('Please enter the 6-digit OTP');
      return;
    }

    try {
      const otpDoc = await db.collection('dt_otp').doc(loginId).get();
      if (!otpDoc.exists) {
        setAuthError('OTP expired or not found. Please request a new one.');
        return;
      }

      const otpData = otpDoc.data();

      if (otpData.attempts >= 5) {
        setAuthError('Too many failed attempts. Please request a new OTP.');
        await db.collection('dt_otp').doc(loginId).delete();
        return;
      }

      if (Date.now() > otpData.expiresAt) {
        setAuthError('OTP has expired. Please request a new one.');
        await db.collection('dt_otp').doc(loginId).delete();
        return;
      }

      if (otpData.otp !== otpValue) {
        await db.collection('dt_otp').doc(loginId).update({
          attempts: otpData.attempts + 1
        });
        setAuthError('Incorrect OTP. ' + (4 - otpData.attempts) + ' attempts remaining.');
        return;
      }

      // OTP verified — move to set new password step
      await db.collection('dt_otp').doc(loginId).delete();
      setForgotStep(3);
      setOtpSuccess('OTP verified successfully! Set your new password.');
    } catch (err) {
      console.error('OTP verify error:', err);
      setAuthError('Verification failed. Please try again.');
    }
  };

  const handleResetPasswordWithOTP = async (e) => {
    e.preventDefault();
    setAuthError('');
    setOtpSuccess('');

    if (changeNewPw.length < 4) {
      setAuthError('Password must be at least 4 characters');
      return;
    }
    if (changeNewPw !== changeConfirmPw) {
      setAuthError('New passwords do not match');
      return;
    }

    try {
      await db.collection('dt_users').doc(loginId).update({
        password: changeNewPw,
        requiresPasswordChange: false
      });

      setAuthError('');
      setOtpSuccess('Password reset successfully! Please login.');
      setTimeout(() => {
        setView('login');
        setForgotStep(1);
        setChangeNewPw(''); setChangeConfirmPw('');
        setOtpValue(''); setOtpSuccess(''); setLoginId('');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setAuthError('Failed to reset password. Please try again.');
    }
  };

  const resetForgotFlow = () => {
    setView('login');
    setForgotStep(1);
    setOtpValue('');
    setOtpSending(false);
    setOtpTimer(0);
    setAuthError('');
    setOtpSuccess('');
    setChangeNewPw('');
    setChangeConfirmPw('');
    setLoginId('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (users.length === 0) {
      setAuthError('Database connecting... Please wait 2 seconds.');
      return;
    }
    const user = users.find(u => u.id === loginId && u.password === loginPw);
    if (user) {
      setCurrentUser(user);
    } else {
      setAuthError('Invalid Employee Selection or Password');
    }
  };

  const handlePasswordChange = async (e, isForce = false) => {
    e.preventDefault();
    setAuthError('');
    if (changeNewPw !== changeConfirmPw) {
      setAuthError('New passwords do not match'); return;
    }

    if (isForce) {
       if (changeNewPw.length < 4) {
         setAuthError('Password must be at least 4 characters'); return;
       }
       await db.collection('dt_users').doc(currentUser.id).update({
         password: changeNewPw,
         requiresPasswordChange: false
       });

       const updatedUser = { ...currentUser, password: changeNewPw, requiresPasswordChange: false };
       setCurrentUser(updatedUser);
       setChangeNewPw(''); setChangeConfirmPw('');
    } else {
       const user = users.find(u => u.id === loginId && u.password === changeOldPw);
       if (!user) {
         setAuthError('Incorrect User or Current Password'); return;
       }
       if (changeNewPw.length < 4) {
         setAuthError('Password must be at least 4 characters'); return;
       }

       await db.collection('dt_users').doc(loginId).update({
         password: changeNewPw,
         requiresPasswordChange: false
       });

       setAuthError('Password updated successfully! Please login.');
       setView('login');
       setChangeOldPw(''); setChangeNewPw(''); setChangeConfirmPw(''); setLoginPw(''); setLoginId('');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setLoginId('');
    setLoginPw('');
    setView('login');
  };

  if (!currentUser && view === 'login') {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-box">
          <div className="auth-header">
            <h1>DT To-Do System</h1>
            <p>Select your name to login</p>
          </div>
          {authError && <div className="alert-warning">{authError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Select User</label>
              <select value={loginId} onChange={e => setLoginId(e.target.value)} required>
                <option value="">Select User...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Login</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-logout" onClick={() => { setView('forgotPassword'); setAuthError(''); setOtpSuccess(''); setForgotStep(1); }}>Forgot Password?</button>
            <button className="btn-logout" onClick={() => { setView('changePassword'); setAuthError(''); }}>Change Password</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && view === 'forgotPassword') {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-box">
          <div className="auth-header">
            <h1>Reset Password</h1>
            <p>
              {forgotStep === 1 && 'Select your account to receive an OTP'}
              {forgotStep === 2 && 'Enter the 6-digit code sent to your email'}
              {forgotStep === 3 && 'Set your new password'}
            </p>
          </div>

          {/* Step indicators */}
          <div className="otp-steps">
            <div className={`otp-step ${forgotStep >= 1 ? 'active' : ''}`}><span>1</span> Verify Identity</div>
            <div className={`otp-step ${forgotStep >= 2 ? 'active' : ''}`}><span>2</span> Enter OTP</div>
            <div className={`otp-step ${forgotStep >= 3 ? 'active' : ''}`}><span>3</span> New Password</div>
          </div>

          {authError && <div className="alert-warning">{authError}</div>}
          {otpSuccess && <div className="alert-success">{otpSuccess}</div>}

          {/* Step 1: Select user and send OTP */}
          {forgotStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Select User</label>
                <select value={loginId} onChange={e => setLoginId(e.target.value)} required>
                  <option value="">Select User...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              {loginId && users.find(u => u.id === loginId)?.email && (
                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  OTP will be sent to: <strong>{maskEmail(users.find(u => u.id === loginId).email)}</strong>
                </p>
              )}
              <button
                className="btn-primary"
                onClick={handleSendOTP}
                disabled={otpSending || !loginId}
                style={{ opacity: (otpSending || !loginId) ? 0.6 : 1 }}
              >
                {otpSending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* Step 2: Enter OTP */}
          {forgotStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  value={otpValue}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpValue(val);
                  }}
                  placeholder="000000"
                  maxLength="6"
                  className="otp-input"
                  autoFocus
                />
              </div>
              <button className="btn-primary" onClick={handleVerifyOTP} disabled={otpValue.length !== 6}>
                Verify OTP
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                {otpTimer > 0 ? (
                  <span>Resend OTP in <strong>{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</strong></span>
                ) : (
                  <button className="btn-logout" onClick={handleSendOTP} disabled={otpSending}>
                    {otpSending ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Set new password */}
          {forgotStep === 3 && (
            <form onSubmit={handleResetPasswordWithOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={changeNewPw} onChange={e => setChangeNewPw(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={changeConfirmPw} onChange={e => setChangeConfirmPw(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary">Reset Password</button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn-logout" onClick={resetForgotFlow}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && view === 'changePassword') {
    return (
       <div className="auth-container">
        <div className="glass-panel auth-box">
          <div className="auth-header">
            <h1>Change Password</h1>
            <p>Update your credentials securely</p>
          </div>
          {authError && <div className="alert-warning">{authError}</div>}
          <form onSubmit={(e) => handlePasswordChange(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Select User</label>
              <select value={loginId} onChange={e => setLoginId(e.target.value)} required>
                <option value="">Select User...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={changeOldPw} onChange={e => setChangeOldPw(e.target.value)} required />
            </div>
             <div className="form-group">
              <label>New Password</label>
              <input type="password" value={changeNewPw} onChange={e => setChangeNewPw(e.target.value)} required />
            </div>
             <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={changeConfirmPw} onChange={e => setChangeConfirmPw(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Update Password</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn-logout" onClick={() => { setView('login'); setAuthError(''); }}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser && view === 'forcePasswordChange') {
    return (
       <div className="auth-container">
        <div className="glass-panel auth-box">
          <div className="auth-header">
            <h1>Welcome, {currentUser.name}</h1>
            <p>Please set a new password for your first login</p>
          </div>
          {authError && <div className="alert-warning">{authError}</div>}
          <form onSubmit={(e) => handlePasswordChange(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div className="form-group">
              <label>New Password</label>
              <input type="password" value={changeNewPw} onChange={e => setChangeNewPw(e.target.value)} required />
            </div>
             <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={changeConfirmPw} onChange={e => setChangeConfirmPw(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Set Password & Continue</button>
          </form>
        </div>
      </div>
    );
  }

  return <Dashboard currentUser={currentUser} users={users} tasks={tasks} logout={logout} />;
}

function Dashboard({ currentUser, users, tasks, logout }) {
  const [activeTab, setActiveTab] = useState('All tasks');
  const [deleteModalContent, setDeleteModalContent] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const handleEditClick = (task) => {
    setEditingTaskId(task.id);
    setTName(task.name);
    setTDesc(task.desc);
    setTAssignee(task.assignedToId);
    setTDate(task.date);
    setTTime(task.time || '');
    setTPriority(task.priority || 'Medium');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setTName(''); setTDesc(''); setTAssignee(''); setTDate(''); setTTime(''); setTPriority('Medium');
  };

  const [tName, setTName] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tAssignee, setTAssignee] = useState('');
  const [tDate, setTDate] = useState('');
  const [tTime, setTTime] = useState('');
  const [tPriority, setTPriority] = useState('Medium');
  const [formError, setFormError] = useState('');

  const handleExportCSV = () => {
     let csvContent = "data:text/csv;charset=utf-8,ID,Title,Description,Assigned From,Assigned To,Date,Time,Priority,Status\n";
     tasks.forEach(t => {
       const row = [t.id, t.name, t.desc, t.assignedByName, t.assignedToName, t.date, t.time || 'N/A', t.priority, t.status];
       csvContent += row.map(v => `"${v}"`).join(",") + "\n";
     });
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "dt_tasks_export.csv");
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!tName || !tDesc || !tAssignee || !tDate || !tPriority) {
       setFormError('Please fill all inputs except time.');
       return;
    }
    setFormError('');

    let aUser = users.find(u => u.id === tAssignee);

    if (editingTaskId) {
      await db.collection('dt_tasks').doc(editingTaskId).update({
        name: tName,
        desc: tDesc,
        assignedToId: aUser.id,
        assignedToName: aUser.name,
        assignedToLevel: aUser.level,
        date: tDate,
        time: tTime,
        priority: tPriority
      });
      setEditingTaskId(null);
    } else {
      const newTask = {
        name: tName,
        desc: tDesc,
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        assignedToId: aUser.id,
        assignedToName: aUser.name,
        assignedByLevel: currentUser.level,
        assignedToLevel: aUser.level,
        date: tDate,
        time: tTime,
        priority: tPriority,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        deletedBy: null
      };
      await db.collection('dt_tasks').add(newTask);
    }
    setTName(''); setTDesc(''); setTAssignee(''); setTDate(''); setTTime(''); setTPriority('Medium');
  };

  const handleTaskAction = async (taskId, action) => {
    if (action === 'complete') {
      await db.collection('dt_tasks').doc(taskId).update({ status: 'completed' });
    } else if (action === 'reopen') {
      await db.collection('dt_tasks').doc(taskId).update({ status: 'pending' });
    }
  };

  const confirmDelete = async (taskId) => {
    await db.collection('dt_tasks').doc(taskId).update({
      status: 'deleted',
      deletedBy: currentUser.name
    });
    setDeleteModalContent(null);
  };

  const isMaster = currentUser.id === '96714';
  const showDeletedTab = isMaster || currentUser.id === 'C8642';

  const processedTasks = useMemo(() => {
    let filtered = [...tasks];

    if (activeTab === 'All tasks') filtered = filtered.filter(t => t.status !== 'deleted');
    else if (activeTab === 'Pending') filtered = filtered.filter(t => t.status === 'pending');
    else if (activeTab === 'Completed') filtered = filtered.filter(t => t.status === 'completed');
    else if (activeTab === 'Assigned to me') filtered = filtered.filter(t => t.status !== 'deleted' && t.assignedToId === currentUser.id);
    else if (activeTab === 'Deleted tasks') filtered = filtered.filter(t => t.status === 'deleted');

    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const todayStr = new Date().toISOString().split('T')[0];

    filtered.sort((a, b) => {
      const aIsOverdue = a.status === 'pending' && a.date < todayStr;
      const bIsOverdue = b.status === 'pending' && b.date < todayStr;

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return priorityWeight[b.priority] - (priorityWeight[a.priority] || 0);
    });

    return filtered;
  }, [tasks, activeTab, currentUser.id]);

  const stats = {
    all: tasks.filter(t => t.status !== 'deleted' && t.status !== 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <h1>DT Dashboard</h1>
        </div>
        <div className="header-actions">
           {currentUser.id === 'C8642' && (
              <button className="btn-success" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icons.Download /> Export Data
              </button>
           )}
           <div className="profile-pill">
             <div className="profile-icon"><Icons.User /></div>
             <div className="profile-info">
               <span className="profile-name">{currentUser.name}</span>
               <span className="profile-role">{currentUser.role}</span>
             </div>
           </div>
           <button onClick={logout} className="btn-logout" style={{display: 'flex', alignItems: 'center', gap:'4px'}}>
             Logout <Icons.LogOut />
           </button>
        </div>
      </header>

      <div className="dashboard-stats">
        <div className="glass-panel stat-card">
          <span className="stat-label">Active Tasks</span>
          <span className="stat-value" style={{color: '#4f46e5'}}>{stats.all}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value" style={{color: '#f97316'}}>{stats.pending}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Overdue</span>
          <span className="stat-value" style={{color: '#ef4444'}}>{stats.overdue}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{color: '#10b981'}}>{stats.completed}</span>
        </div>
      </div>

      <div className="main-content">
        <div className="task-feed">
           <div className="tabs">
             {['All tasks', 'Pending', 'Completed', 'Assigned to me'].map(t => (
               <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
             ))}
             {showDeletedTab && (
                <button className={`tab-btn ${activeTab === 'Deleted tasks' ? 'active' : ''}`} onClick={() => setActiveTab('Deleted tasks')}>Deleted tasks</button>
             )}
           </div>

           <div className="task-list">
             {processedTasks.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                 No tasks found in this category.
               </div>
             ) : processedTasks.map(task => {
                const isOverdue = task.status === 'pending' && task.date < new Date().toISOString().split('T')[0];
                const badgeType = task.assignedByLevel <= task.assignedToLevel ? 'Assign' : 'Request';
                const canEditDelete = isMaster || task.assignedById === currentUser.id;

                return (
                  <div key={task.id} className={`glass-panel task-card priority-${task.priority?.toLowerCase() || 'medium'} ${isOverdue ? 'overdue' : ''} status-${task.status}`}>
                     <div className="task-header">
                       <h4 className="task-title">{task.name}</h4>
                       <div className="task-badges">
                          <span className={`badge badge-${badgeType.toLowerCase()}`}>{badgeType}</span>
                          <span className="badge" style={{background: '#f3f4f6', color: '#4b5563'}}>{task.priority}</span>
                          {isOverdue && <span className="badge" style={{background: '#fee2e2', color: '#ef4444'}}>Overdue</span>}
                       </div>
                     </div>
                     <p className="task-desc">{task.desc}</p>

                     <div className="task-meta">
                       <span><strong>From:</strong> {task.assignedByName}</span>
                       <span><strong>To:</strong> {task.assignedToName}</span>
                       <span><strong>Due Date:</strong> {task.date}</span>
                       {task.time && <span><strong>Time:</strong> {task.time}</span>}
                       {task.status === 'deleted' && <span style={{color: '#ef4444'}}><strong>Deleted by:</strong> {task.deletedBy}</span>}
                     </div>

                     {task.status !== 'deleted' && (
                       <div className="task-actions">
                          {task.status === 'pending' ? (
                            <button onClick={() => handleTaskAction(task.id, 'complete')} className="icon-btn success" title="Mark Completed"><Icons.Check /></button>
                          ) : (
                            <button onClick={() => handleTaskAction(task.id, 'reopen')} className="btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize:'0.8rem'}}>Reopen</button>
                          )}

                          {canEditDelete && (
                            <>
                              <button onClick={() => handleEditClick(task)} className="icon-btn" title="Edit"><Icons.Edit /></button>
                              <button onClick={() => setDeleteModalContent({id: task.id, name: task.name})} className="icon-btn danger" title="Delete"><Icons.Trash /></button>
                            </>
                          )}
                       </div>
                     )}
                  </div>
                );
             })}
           </div>
        </div>

        <div className="sidebar">
          <div className="glass-panel task-form-panel">
            <h3>{editingTaskId ? 'Edit Directive' : 'Create Directive'}</h3>
            {formError && <div className="alert-warning">{formError}</div>}
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div className="form-group">
                 <label>Task Name *</label>
                 <input type="text" value={tName} onChange={e => setTName(e.target.value)} />
               </div>
               <div className="form-group">
                 <label>Description *</label>
                 <textarea value={tDesc} onChange={e => setTDesc(e.target.value)} rows="3" />
               </div>
               <div className="form-group">
                 <label>Assignee *</label>
                 <select value={tAssignee} onChange={e => setTAssignee(e.target.value)}>
                   <option value="">Select User...</option>
                   {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                 </select>
               </div>
               <div style={{display: 'flex', gap: '1rem'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Date *</label>
                    <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Time (Optional)</label>
                    <input type="time" value={tTime} onChange={e => setTTime(e.target.value)} />
                  </div>
               </div>
               <div className="form-group">
                 <label>Priority *</label>
                 <select value={tPriority} onChange={e => setTPriority(e.target.value)}>
                   <option value="High">High</option>
                   <option value="Medium">Medium</option>
                   <option value="Low">Low</option>
                 </select>
               </div>
               <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                 <button type="submit" className="btn-primary" style={{flex: 1}}>
                   {editingTaskId ? 'Update Directive' : 'Add Directive'}
                 </button>
                 {editingTaskId && (
                   <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
                 )}
               </div>
            </form>
          </div>
        </div>
      </div>

      {deleteModalContent && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
             <h3 className="modal-title">Delete Task?</h3>
             <p className="modal-body">Are you sure you want to delete "{deleteModalContent.name}"? It will be moved to the deleted tasks archive.</p>
             <div className="modal-actions">
               <button onClick={() => setDeleteModalContent(null)} className="btn-secondary">Cancel</button>
               <button onClick={() => confirmDelete(deleteModalContent.id)} className="btn-primary" style={{background: '#ef4444'}}>Yes, Delete</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
