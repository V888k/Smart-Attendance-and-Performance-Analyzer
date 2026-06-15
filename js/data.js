// ====== Smart Attendance & Performance Analyzer - Data Layer ======

const DataStore = (() => {
    const STORAGE_KEY = 'sarpa_data';
    const DATA_VERSION = 3;

    const defaultData = {
        admin: {
            username: 'admin',
            password: '123456',
            name: 'Administrator',
            email: 'admin@college.edu'
        },
        teachers: [
            { id: 't1', username: 'ds',   password: '123456', name: 'Prof. Arjun Mehta',   email: 'arjun.mehta@college.edu',     course: 'Data Structures',         courseCode: 'CS201' },
            { id: 't2', username: 'dbms', password: '123456', name: 'Prof. Priya Sharma',  email: 'priya.sharma@college.edu',    course: 'Database Management Systems', courseCode: 'CS202' },
            { id: 't3', username: 'os',   password: '123456', name: 'Prof. Rajesh Kumar',  email: 'rajesh.kumar@college.edu',    course: 'Operating Systems',       courseCode: 'CS203' },
            { id: 't4', username: 'cn',   password: '123456', name: 'Prof. Sneha Patel',   email: 'sneha.patel@college.edu',     course: 'Computer Networks',       courseCode: 'CS204' },
            { id: 't5', username: 'se',   password: '123456', name: 'Prof. Vikram Singh',  email: 'vikram.singh@college.edu',    course: 'Software Engineering',    courseCode: 'CS205' }
        ],
        students: [
            { id: 's1', rollno: 'CS2024001', name: 'Aarav Gupta',      email: 'aarav@college.edu',       batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's2', rollno: 'CS2024002', name: 'Ananya Iyer',      email: 'ananya@college.edu',      batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's3', rollno: 'CS2024003', name: 'Rohan Desai',      email: 'rohan@college.edu',       batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's4', rollno: 'CS2024004', name: 'Sanya Kapoor',     email: 'sanya@college.edu',       batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's5', rollno: 'CS2024005', name: 'Dev Patel',        email: 'dev@college.edu',          batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's6', rollno: 'CS2024006', name: 'Kavya Nair',       email: 'kavya@college.edu',        batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's7', rollno: 'CS2024007', name: 'Arjun Reddy',      email: 'arjunr@college.edu',       batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's8', rollno: 'CS2024008', name: 'Neha Verma',       email: 'neha@college.edu',         batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's9', rollno: 'CS2024009', name: 'Yash Thakur',      email: 'yash@college.edu',         batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] },
            { id: 's10', rollno: 'CS2024010', name: 'Shreya Joshi',    email: 'shreya@college.edu',       batch: '2024-28', courses: ['CS201','CS202','CS203','CS204','CS205'] }
        ],
        attendance: [],
        announcements: [],
        auditLog: [],
        config: { minAttendance: 75, lateGraceMinutes: 10, semesterStart: '2026-03-01', semesterEnd: '2026-06-15' }
    };

    let data = null;
    let currentUser = null;

    function init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            data = JSON.parse(stored);
            if (data._version !== DATA_VERSION) {
                data = JSON.parse(JSON.stringify(defaultData));
                data._version = DATA_VERSION;
                generateSampleAttendance();
                save();
            }
        } else {
            data = JSON.parse(JSON.stringify(defaultData));
            data._version = DATA_VERSION;
            generateSampleAttendance();
            save();
        }
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function resetData() {
        localStorage.removeItem(STORAGE_KEY);
        init();
    }

    function generateSampleAttendance() {
        const dates = [];
        const start = new Date('2026-03-01');
        const end = new Date('2026-06-12');
        const statuses = ['present','present','present','present','present','absent','late'];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            dates.push(d.toISOString().split('T')[0]);
        }

        data.attendance = [];
        let aid = 1;
        data.teachers.forEach(t => {
            const courseStudents = data.students.filter(s => s.courses.includes(t.courseCode));
            dates.forEach(date => {
                courseStudents.forEach(s => {
                    const status = statuses[Math.floor(Math.random() * statuses.length)];
                    data.attendance.push({
                        id: 'a' + (aid++),
                        studentId: s.id,
                        teacherId: t.id,
                        courseCode: t.courseCode,
                        date: date,
                        status: status,
                        remarks: ''
                    });
                });
            });
        });
    }

    // Auth
    function authenticate(username, password, role) {
        if (role === 'admin' && username === data.admin.username && password === data.admin.password) {
            currentUser = { role: 'admin', name: data.admin.name, username: username };
            return currentUser;
        }
        if (role === 'teacher') {
            const teacher = data.teachers.find(t => t.username === username && t.password === password);
            if (teacher) {
                currentUser = { role: 'teacher', ...teacher };
                return currentUser;
            }
        }
        if (role === 'student') {
            const student = data.students.find(s => s.rollno === username && password === '123456');
            if (student) {
                currentUser = { role: 'student', ...student };
                return currentUser;
            }
        }
        return null;
    }

    function getCurrentUser() { return currentUser; }

    function logout() { currentUser = null; }

    // Admin CRUD - Teachers
    function getTeachers() { return [...data.teachers]; }

    function addTeacher(teacher) {
        teacher.id = 't' + Date.now();
        data.teachers.push(teacher);
        save();
        addAuditLog('Added teacher: ' + teacher.name);
    }

    function updateTeacher(id, updates) {
        const idx = data.teachers.findIndex(t => t.id === id);
        if (idx >= 0) { Object.assign(data.teachers[idx], updates); save(); addAuditLog('Updated teacher: ' + data.teachers[idx].name); }
    }

    function deleteTeacher(id) {
        const t = data.teachers.find(t => t.id === id);
        data.teachers = data.teachers.filter(t => t.id !== id);
        data.attendance = data.attendance.filter(a => a.teacherId !== id);
        save();
        if (t) addAuditLog('Deleted teacher: ' + t.name);
    }

    // Admin CRUD - Students
    function getStudents() { return [...data.students]; }

    function addStudent(student) {
        student.id = 's' + Date.now();
        if (!student.courses) student.courses = [];
        data.students.push(student);
        save();
        addAuditLog('Added student: ' + student.name + ' (' + student.rollno + ')');
    }

    function updateStudent(id, updates) {
        const idx = data.students.findIndex(s => s.id === id);
        if (idx >= 0) { Object.assign(data.students[idx], updates); save(); addAuditLog('Updated student: ' + data.students[idx].name); }
    }

    function deleteStudent(id) {
        const s = data.students.find(s => s.id === id);
        data.students = data.students.filter(s => s.id !== id);
        data.attendance = data.attendance.filter(a => a.studentId !== id);
        save();
        if (s) addAuditLog('Deleted student: ' + s.name);
    }

    // Teacher - Enroll student in course
    function enrollStudentInCourse(studentId, courseCode) {
        const student = data.students.find(s => s.id === studentId);
        if (student && !student.courses.includes(courseCode)) {
            student.courses.push(courseCode);
            save();
            addAuditLog('Enrolled ' + student.name + ' in ' + courseCode);
            return true;
        }
        return false;
    }

    function removeStudentFromCourse(studentId, courseCode) {
        const student = data.students.find(s => s.id === studentId);
        if (student) {
            student.courses = student.courses.filter(c => c !== courseCode);
            data.attendance = data.attendance.filter(a => !(a.studentId === studentId && a.courseCode === courseCode));
            save();
            addAuditLog('Removed ' + student.name + ' from ' + courseCode);
            return true;
        }
        return false;
    }

    // Teacher - Mark attendance
    function markAttendance(studentId, teacherId, courseCode, date, status, remarks) {
        const existing = data.attendance.find(a => a.studentId === studentId && a.teacherId === teacherId && a.courseCode === courseCode && a.date === date);
        if (existing) {
            existing.status = status;
            existing.remarks = remarks || '';
        } else {
            data.attendance.push({
                id: 'a' + Date.now() + Math.random(),
                studentId, teacherId, courseCode, date, status,
                remarks: remarks || ''
            });
        }
        save();
    }

    function markBatchAttendance(records) {
        records.forEach(r => markAttendance(r.studentId, r.teacherId, r.courseCode, r.date, r.status, r.remarks));
    }

    // Get attendance records
    function getAttendanceByCourse(courseCode) {
        return data.attendance.filter(a => a.courseCode === courseCode);
    }

    function getAttendanceByStudent(studentId) {
        return data.attendance.filter(a => a.studentId === studentId);
    }

    function getAttendanceByTeacher(teacherId) {
        return data.attendance.filter(a => a.teacherId === teacherId);
    }

    function getAttendanceByDate(date) {
        return data.attendance.filter(a => a.date === date);
    }

    function getAttendanceStats(studentId, courseCode) {
        let records = data.attendance.filter(a => a.studentId === studentId);
        if (courseCode) records = records.filter(a => a.courseCode === courseCode);
        const total = records.length;
        const present = records.filter(a => a.status === 'present').length;
        const absent = records.filter(a => a.status === 'absent').length;
        const late = records.filter(a => a.status === 'late').length;
        return { total, present, absent, late, percentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0' };
    }

    function getMonthlyAttendanceStats(studentId, courseCode) {
        const records = data.attendance.filter(a => {
            if (a.studentId !== studentId) return false;
            if (courseCode && a.courseCode !== courseCode) return false;
            return true;
        });
        const monthly = {};
        records.forEach(r => {
            const month = r.date.substring(0, 7);
            if (!monthly[month]) monthly[month] = { total: 0, present: 0, absent: 0, late: 0 };
            monthly[month].total++;
            monthly[month][r.status]++;
        });
        return Object.entries(monthly).sort((a,b) => a[0].localeCompare(b[0]));
    }

    // Audit
    function addAuditLog(action) {
        data.auditLog.push({
            timestamp: new Date().toISOString(),
            user: currentUser ? currentUser.username : 'system',
            action: action
        });
        save();
    }

    function getAuditLog() { return [...data.auditLog].reverse(); }

    // Announcements
    function addAnnouncement(text) {
        data.announcements.push({ id: 'ann' + Date.now(), text, date: new Date().toISOString(), author: currentUser.name });
        save();
    }

    function getAnnouncements() { return [...data.announcements].reverse(); }

    // Config
    function getConfig() { return { ...data.config }; }

    function updateConfig(updates) {
        Object.assign(data.config, updates);
        save();
        addAuditLog('Updated system configuration');
    }

    function getStudentsNotInCourse(courseCode) {
        return data.students.filter(s => !s.courses.includes(courseCode));
    }

    function getStudentsInCourse(courseCode) {
        return data.students.filter(s => s.courses.includes(courseCode));
    }

    init();

    return {
        init, resetData, authenticate, getCurrentUser, logout,
        getTeachers, addTeacher, updateTeacher, deleteTeacher,
        getStudents, addStudent, updateStudent, deleteStudent,
        enrollStudentInCourse, removeStudentFromCourse,
        markAttendance, markBatchAttendance,
        getAttendanceByCourse, getAttendanceByStudent, getAttendanceByTeacher, getAttendanceByDate,
        getAttendanceStats, getMonthlyAttendanceStats,
        getAuditLog, addAnnouncement, getAnnouncements,
        getConfig, updateConfig,
        getStudentsNotInCourse, getStudentsInCourse,
        admin: data.admin, defaultData
    };
})();
