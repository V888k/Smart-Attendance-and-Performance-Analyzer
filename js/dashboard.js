// ====== Smart Attendance & Performance Analyzer - Dashboard ======

const App = (() => {
    let currentPage = 'overview';
    let charts = {};

    const chartColors = {
        mint: '#00b894', crimson: '#d63031', amber: '#fdcb6e',
        teal: '#0f3460', coral: '#e94560', navy: '#1a1a2e',
        mutedMint: 'rgba(0,184,148,0.7)', mutedRed: 'rgba(214,48,49,0.7)', mutedAmber: 'rgba(253,203,110,0.7)',
        mutedTeal: 'rgba(15,52,96,0.7)', mutedCoral: 'rgba(233,69,96,0.7)'
    };

    function init() {
        const userJson = localStorage.getItem('sarpa_current_user');
        if (!userJson) { window.location.href = 'index.html'; return; }
        DataStore.init();
        const user = JSON.parse(userJson);
        DataStore.authenticate(user.username, user.role === 'admin' ? DataStore.admin.password : (user.password || ''), user.role);

        renderSidebar();
        renderUserInfo();
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

        const savedTheme = localStorage.getItem('sarpa_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('themeIcon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';

        navigateTo('overview');
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.getElementById('themeIcon').textContent = next === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('sarpa_theme', next);
        Object.values(charts).forEach(c => {
            if (c && c.destroy) c.destroy();
        });
        charts = {};
        navigateTo(currentPage);
    }

    function logout() {
        localStorage.removeItem('sarpa_current_user');
        window.location.href = 'index.html';
    }

    function getCurrentUser() {
        return DataStore.getCurrentUser() || JSON.parse(localStorage.getItem('sarpa_current_user') || '{}');
    }

    // ====== Sidebar ======
    function renderSidebar() {
        const user = getCurrentUser();
        const nav = document.getElementById('sidebarNav');
        let items = [];

        if (user.role === 'admin') {
            items = [
                { id: 'overview', icon: '📊', label: 'Overview' },
                { id: 'manage-teachers', icon: '👨‍🏫', label: 'Manage Teachers' },
                { id: 'manage-students', icon: '👨‍🎓', label: 'Manage Students' },
                { id: 'announcements', icon: '📢', label: 'Announcements' },
                { id: 'audit-log', icon: '📋', label: 'Audit Log' },
                { id: 'settings', icon: '⚙️', label: 'Settings' }
            ];
        } else if (user.role === 'teacher') {
            items = [
                { id: 'overview', icon: '📊', label: 'Overview' },
                { id: 'my-course', icon: '📚', label: 'My Course' },
                { id: 'mark-attendance', icon: '✅', label: 'Mark Attendance' },
                { id: 'view-attendance', icon: '📅', label: 'View Attendance' },
                { id: 'student-data', icon: '👨‍🎓', label: 'Student Data' }
            ];
        } else if (user.role === 'student') {
            items = [
                { id: 'overview', icon: '📊', label: 'Overview' },
                { id: 'my-attendance', icon: '📋', label: 'My Attendance' },
                { id: 'course-breakdown', icon: '📚', label: 'Course Breakdown' },
                { id: 'charts-view', icon: '📈', label: 'Charts' }
            ];
        }

        nav.innerHTML = items.map(item =>
            `<button class="nav-item${currentPage === item.id ? ' active' : ''}" data-page="${item.id}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
            </button>`
        ).join('');

        nav.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
    }

    function renderUserInfo() {
        const user = getCurrentUser();
        document.getElementById('userAvatar').textContent = (user.name || 'U')[0].toUpperCase();
        document.getElementById('sidebarUserName').textContent = user.name || user.username;
        document.getElementById('sidebarUserRole').textContent = user.role === 'admin' ? 'Administrator' : user.role === 'teacher' ? 'Teacher - ' + (user.course || '') : 'Student - ' + (user.rollno || '');
    }

    // ====== Navigation ======
    function navigateTo(page) {
        currentPage = page;
        document.getElementById('pageTitle').textContent = getPageTitle(page);

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        destroyCharts();

        const panels = document.getElementById('dashboardPanels');

        switch (page) {
            case 'overview': panels.innerHTML = renderOverview(); break;
            case 'manage-teachers': panels.innerHTML = renderManageTeachers(); break;
            case 'manage-students': panels.innerHTML = renderManageStudents(); break;
            case 'announcements': panels.innerHTML = renderAnnouncements(); break;
            case 'audit-log': panels.innerHTML = renderAuditLog(); break;
            case 'settings': panels.innerHTML = renderSettings(); break;
            case 'my-course': panels.innerHTML = renderTeacherCourse(); break;
            case 'mark-attendance': panels.innerHTML = renderMarkAttendance(); break;
            case 'view-attendance': panels.innerHTML = renderViewAttendance(); break;
            case 'student-data': panels.innerHTML = renderStudentData(); break;
            case 'my-attendance': panels.innerHTML = renderStudentMyAttendance(); break;
            case 'course-breakdown': panels.innerHTML = renderStudentCourseBreakdown(); break;
            case 'charts-view': panels.innerHTML = renderStudentCharts(); break;
        }

        setTimeout(setupPageEvents, 50);
    }

    function getPageTitle(page) {
        const titles = {
            'overview': 'Dashboard Overview', 'manage-teachers': 'Manage Teachers', 'manage-students': 'Manage Students',
            'announcements': 'Announcements', 'audit-log': 'Audit Log', 'settings': 'System Settings',
            'my-course': 'My Course', 'mark-attendance': 'Mark Attendance', 'view-attendance': 'View Attendance',
            'student-data': 'Student Data', 'my-attendance': 'My Attendance', 'course-breakdown': 'Course Breakdown',
            'charts-view': 'Attendance Charts'
        };
        return titles[page] || 'Dashboard';
    }

    function destroyCharts() {
        Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
        charts = {};
    }

    // ====== Overview ======
    function renderOverview() {
        const user = getCurrentUser();
        const allStudents = DataStore.getStudents();
        const allTeachers = DataStore.getTeachers();

        let statsHTML = '';
        if (user.role === 'admin') {
            statsHTML = `
                <div class="stat-card"><div class="stat-icon teal">👨‍🏫</div><div class="stat-info"><h4>${allTeachers.length}</h4><p>Total Teachers</p></div></div>
                <div class="stat-card"><div class="stat-icon coral">👨‍🎓</div><div class="stat-info"><h4>${allStudents.length}</h4><p>Total Students</p></div></div>
                <div class="stat-card"><div class="stat-icon mint">📅</div><div class="stat-info"><h4>${DataStore.getAttendanceByDate(new Date().toISOString().split('T')[0]).length}</h4><p>Today's Marks</p></div></div>
                <div class="stat-card"><div class="stat-icon amber">📋</div><div class="stat-info"><h4>${DataStore.getAnnouncements().length}</h4><p>Announcements</p></div></div>`;
        } else if (user.role === 'teacher') {
            const courseStudents = DataStore.getStudentsInCourse(user.courseCode);
            const totalRecords = DataStore.getAttendanceByTeacher(user.id);
            const todayRecords = totalRecords.filter(a => a.date === new Date().toISOString().split('T')[0]);
            const presentToday = todayRecords.filter(a => a.status === 'present').length;
            const avgPct = totalRecords.length > 0 ? ((totalRecords.filter(a => a.status === 'present').length / totalRecords.length) * 100).toFixed(1) : '0';
            statsHTML = `
                <div class="stat-card"><div class="stat-icon teal">👨‍🎓</div><div class="stat-info"><h4>${courseStudents.length}</h4><p>Enrolled Students</p></div></div>
                <div class="stat-card"><div class="stat-icon coral">📊</div><div class="stat-info"><h4>${avgPct}%</h4><p>Overall Attendance</p></div></div>
                <div class="stat-card"><div class="stat-icon mint">✅</div><div class="stat-info"><h4>${presentToday}</h4><p>Present Today</p></div></div>
                <div class="stat-card"><div class="stat-icon amber">📅</div><div class="stat-info"><h4>${totalRecords.length}</h4><p>Total Records</p></div></div>`;
        } else {
            const records = DataStore.getAttendanceByStudent(user.id);
            const totalRecords = records.length;
            const present = records.filter(a => a.status === 'present').length;
            const absent = records.filter(a => a.status === 'absent').length;
            const late = records.filter(a => a.status === 'late').length;
            const pct = totalRecords > 0 ? ((present / totalRecords) * 100).toFixed(1) : '0';
            const enrolled = DataStore.getStudents().find(s => s.id === user.id);
            const courseCount = enrolled ? enrolled.courses.length : 0;
            statsHTML = `
                <div class="stat-card"><div class="stat-icon teal">📊</div><div class="stat-info"><h4>${pct}%</h4><p>Overall Attendance</p></div></div>
                <div class="stat-card"><div class="stat-icon mint">✅</div><div class="stat-info"><h4>${present}</h4><p>Present</p></div></div>
                <div class="stat-card"><div class="stat-icon coral">❌</div><div class="stat-info"><h4>${absent}</h4><p>Absent</p></div></div>
                <div class="stat-card"><div class="stat-icon amber">📚</div><div class="stat-info"><h4>${courseCount}</h4><p>Courses</p></div></div>`;
        }

        let chartHTML = '';
        if (user.role === 'admin') {
            chartHTML = `
                <div class="grid-2 mt-20">
                    <div class="chart-card"><h3>Teacher Distribution</h3><div class="chart-wrap"><canvas id="chartTeacherDist"></canvas></div></div>
                    <div class="chart-card"><h3>System Statistics</h3><div class="chart-wrap"><canvas id="chartSystemStats"></canvas></div></div>
                </div>`;
        } else if (user.role === 'teacher') {
            chartHTML = `
                <div class="grid-2 mt-20">
                    <div class="chart-card"><h3>Attendance Distribution</h3><div class="chart-wrap"><canvas id="chartAttDist"></canvas></div></div>
                    <div class="chart-card"><h3>Monthly Trend</h3><div class="chart-wrap"><canvas id="chartMonthlyTrend"></canvas></div></div>
                </div>`;
        } else {
            chartHTML = `
                <div class="grid-2 mt-20">
                    <div class="chart-card"><h3>Attendance Overview</h3><div class="chart-wrap"><canvas id="chartAttPie"></canvas></div></div>
                    <div class="chart-card"><h3>Monthly Trend</h3><div class="chart-wrap"><canvas id="chartMonthlyStTrend"></canvas></div></div>
                </div>`;
        }

        return `<div class="stats-row">${statsHTML}</div>${chartHTML}`;
    }

    // ====== Admin: Manage Teachers ======
    function renderManageTeachers() {
        const teachers = DataStore.getTeachers();
        const rows = teachers.map(t => `
            <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.username}</td>
                <td>${t.email}</td>
                <td>${t.course}</td>
                <td><span class="badge badge-teal">${t.courseCode}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="App.editTeacher('${t.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteTeacher('${t.id}')">Delete</button>
                </td>
            </tr>`).join('');

        return `
            <div class="action-bar">
                <div class="action-bar-left"><input class="search-input" id="teacherSearch" placeholder="Search teachers..."></div>
                <button class="btn btn-primary" onclick="App.showAddTeacherModal()">+ Add Teacher</button>
            </div>
            <div class="card"><div class="table-container"><table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Course</th><th>Code</th><th>Actions</th></tr></thead><tbody id="teacherTableBody">${rows}</tbody></table></div></div>`;
    }

    function showAddTeacherModal() {
        const existingCodes = DataStore.getTeachers().map(t => t.courseCode);
        const allCourses = [
            { name: 'Data Structures', code: 'CS201' },
            { name: 'Database Management Systems', code: 'CS202' },
            { name: 'Operating Systems', code: 'CS203' },
            { name: 'Computer Networks', code: 'CS204' },
            { name: 'Software Engineering', code: 'CS205' }
        ].filter(c => !existingCodes.includes(c.code));

        document.getElementById('modalTitle').textContent = 'Add Teacher';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group"><label>Full Name</label><input id="tName" placeholder="Enter name"></div>
            <div class="form-group"><label>Username</label><input id="tUser" placeholder="Enter username"></div>
            <div class="form-group"><label>Password</label><input id="tPass" type="password" placeholder="Enter password" value="123456"></div>
            <div class="form-group"><label>Email</label><input id="tEmail" type="email" placeholder="Enter email"></div>
            <div class="form-group"><label>Course</label>
                <select id="tCourse">${allCourses.map(c => `<option value="${c.code}|${c.name}">${c.name} (${c.code})</option>`).join('')}</select>
            </div>
            <button class="btn btn-primary btn-full mt-16" onclick="App.saveTeacher()">Save Teacher</button>
            <div id="formError" class="error-msg"></div>`;
        openModal();
    }

    function editTeacher(id) {
        const t = DataStore.getTeachers().find(t => t.id === id);
        if (!t) return;

        const allCourses = [
            { name: 'Data Structures', code: 'CS201' },
            { name: 'Database Management Systems', code: 'CS202' },
            { name: 'Operating Systems', code: 'CS203' },
            { name: 'Computer Networks', code: 'CS204' },
            { name: 'Software Engineering', code: 'CS205' }
        ];

        document.getElementById('modalTitle').textContent = 'Edit Teacher';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group"><label>Full Name</label><input id="tName" value="${t.name}"></div>
            <div class="form-group"><label>Username</label><input id="tUser" value="${t.username}"></div>
            <div class="form-group"><label>Password</label><input id="tPass" type="password" value="${t.password}"></div>
            <div class="form-group"><label>Email</label><input id="tEmail" type="email" value="${t.email}"></div>
            <div class="form-group"><label>Course</label>
                <select id="tCourse">${allCourses.map(c => `<option value="${c.code}|${c.name}" ${(t.courseCode === c.code) ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('')}</select>
            </div>
            <button class="btn btn-primary btn-full mt-16" onclick="App.updateTeacherRecord('${id}')">Update Teacher</button>
            <div id="formError" class="error-msg"></div>`;
        openModal();
    }

    function saveTeacher() {
        const name = document.getElementById('tName').value.trim();
        const username = document.getElementById('tUser').value.trim();
        const password = document.getElementById('tPass').value.trim();
        const email = document.getElementById('tEmail').value.trim();
        const courseVal = document.getElementById('tCourse').value;
        const errEl = document.getElementById('formError');

        if (!name || !username || !password || !email) { errEl.textContent = 'All fields are required.'; return; }
        const [courseCode, course] = courseVal.split('|');

        DataStore.addTeacher({ username, password, name, email, course, courseCode });
        closeModal();
        navigateTo('manage-teachers');
    }

    function updateTeacherRecord(id) {
        const name = document.getElementById('tName').value.trim();
        const username = document.getElementById('tUser').value.trim();
        const password = document.getElementById('tPass').value.trim();
        const email = document.getElementById('tEmail').value.trim();
        const courseVal = document.getElementById('tCourse').value;
        const errEl = document.getElementById('formError');

        if (!name || !username || !password || !email) { errEl.textContent = 'All fields are required.'; return; }
        const [courseCode, course] = courseVal.split('|');

        DataStore.updateTeacher(id, { username, password, name, email, course, courseCode });
        closeModal();
        navigateTo('manage-teachers');
    }

    function deleteTeacher(id) {
        if (confirm('Delete this teacher? This will also remove all their attendance records.')) {
            DataStore.deleteTeacher(id);
            navigateTo('manage-teachers');
        }
    }

    // ====== Admin: Manage Students ======
    function renderManageStudents() {
        const students = DataStore.getStudents();
        const rows = students.map(s => `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-coral">${s.rollno}</span></td>
                <td>${s.email}</td>
                <td>${s.batch}</td>
                <td>${s.courses ? s.courses.length : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="App.editStudent('${s.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteStudent('${s.id}')">Delete</button>
                </td>
            </tr>`).join('');

        return `
            <div class="action-bar">
                <div class="action-bar-left"><input class="search-input" id="studentSearch" placeholder="Search students..."></div>
                <button class="btn btn-primary" onclick="App.showAddStudentModal()">+ Add Student</button>
            </div>
            <div class="card"><div class="table-container"><table><thead><tr><th>Name</th><th>Roll No</th><th>Email</th><th>Batch</th><th>Courses</th><th>Actions</th></tr></thead><tbody id="studentTableBody">${rows}</tbody></table></div></div>`;
    }

    function showAddStudentModal() {
        const allCourseCodes = ['CS201:Data Structures', 'CS202:DBMS', 'CS203:Operating Systems', 'CS204:Computer Networks', 'CS205:Software Engineering'];
        document.getElementById('modalTitle').textContent = 'Add Student';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group"><label>Full Name</label><input id="sName" placeholder="Enter name"></div>
            <div class="form-group"><label>Roll Number</label><input id="sRoll" placeholder="e.g. CS2024011"></div>
            <div class="form-group"><label>Email</label><input id="sEmail" type="email" placeholder="Enter email"></div>
            <div class="form-group"><label>Batch</label><input id="sBatch" placeholder="e.g. 2024-28" value="2024-28"></div>
            <div class="form-group"><label>Courses (Ctrl/Cmd+Click for multiple)</label>
                <select id="sCourses" multiple style="height:120px;">${allCourseCodes.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            </div>
            <button class="btn btn-primary btn-full mt-16" onclick="App.saveStudent()">Save Student</button>
            <div id="formError" class="error-msg"></div>`;
        openModal();
    }

    function editStudent(id) {
        const s = DataStore.getStudents().find(s => s.id === id);
        if (!s) return;
        const allCourseCodes = ['CS201:Data Structures', 'CS202:DBMS', 'CS203:Operating Systems', 'CS204:Computer Networks', 'CS205:Software Engineering'];
        const selectedCodes = s.courses || [];
        document.getElementById('modalTitle').textContent = 'Edit Student';
        document.getElementById('modalBody').innerHTML = `
            <div class="form-group"><label>Full Name</label><input id="sName" value="${s.name}"></div>
            <div class="form-group"><label>Roll Number</label><input id="sRoll" value="${s.rollno}"></div>
            <div class="form-group"><label>Email</label><input id="sEmail" type="email" value="${s.email}"></div>
            <div class="form-group"><label>Batch</label><input id="sBatch" value="${s.batch}"></div>
            <div class="form-group"><label>Courses (Ctrl/Cmd+Click for multiple)</label>
                <select id="sCourses" multiple style="height:120px;">
                    ${allCourseCodes.map(c => {
                        const code = c.split(':')[0];
                        return `<option value="${c}" ${selectedCodes.includes(code) ? 'selected' : ''}>${c}</option>`;
                    }).join('')}
                </select>
            </div>
            <button class="btn btn-primary btn-full mt-16" onclick="App.updateStudentRecord('${id}')">Update Student</button>
            <div id="formError" class="error-msg"></div>`;
        openModal();
    }

    function saveStudent() {
        const name = document.getElementById('sName').value.trim();
        const rollno = document.getElementById('sRoll').value.trim();
        const email = document.getElementById('sEmail').value.trim();
        const batch = document.getElementById('sBatch').value.trim();
        const coursesEl = document.getElementById('sCourses');
        const errEl = document.getElementById('formError');
        const courses = Array.from(coursesEl.selectedOptions).map(o => o.value.split(':')[0]);

        if (!name || !rollno || !email || !batch) { errEl.textContent = 'All fields are required.'; return; }
        DataStore.addStudent({ name, rollno, email, batch, courses, password: '123456' });
        closeModal();
        navigateTo('manage-students');
    }

    function updateStudentRecord(id) {
        const name = document.getElementById('sName').value.trim();
        const rollno = document.getElementById('sRoll').value.trim();
        const email = document.getElementById('sEmail').value.trim();
        const batch = document.getElementById('sBatch').value.trim();
        const coursesEl = document.getElementById('sCourses');
        const errEl = document.getElementById('formError');
        const courses = Array.from(coursesEl.selectedOptions).map(o => o.value.split(':')[0]);

        if (!name || !rollno || !email || !batch) { errEl.textContent = 'All fields are required.'; return; }
        DataStore.updateStudent(id, { name, rollno, email, batch, courses });
        closeModal();
        navigateTo('manage-students');
    }

    function deleteStudent(id) {
        if (confirm('Delete this student? This will also remove all their attendance records.')) {
            DataStore.deleteStudent(id);
            navigateTo('manage-students');
        }
    }

    // ====== Admin: Announcements ======
    function renderAnnouncements() {
        const announcements = DataStore.getAnnouncements();
        const list = announcements.length === 0
            ? '<div class="empty-state"><div class="empty-state-icon">📢</div><h4>No Announcements</h4><p>Post your first announcement</p></div>'
            : announcements.map(a => `
                <div class="card mb-8"><div class="card-body">
                    <p>${a.text}</p>
                    <span class="text-muted">${new Date(a.date).toLocaleString()} — ${a.author}</span>
                </div></div>`).join('');

        return `
            <div class="card"><div class="card-body">
                <div class="form-group"><label>New Announcement</label><textarea id="annText" rows="3" placeholder="Type announcement..."></textarea></div>
                <button class="btn btn-primary" onclick="App.postAnnouncement()">Post Announcement</button>
            </div></div>
            <div class="mt-20">${list}</div>`;
    }

    function postAnnouncement() {
        const text = document.getElementById('annText').value.trim();
        if (text) { DataStore.addAnnouncement(text); navigateTo('announcements'); }
    }

    // ====== Admin: Audit Log ======
    function renderAuditLog() {
        const logs = DataStore.getAuditLog();
        const rows = logs.map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.user}</td><td>${l.action}</td></tr>`).join('');
        return `<div class="card"><div class="table-container"><table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="text-center text-muted">No audit records</td></tr>'}</tbody></table></div></div>`;
    }

    // ====== Admin: Settings ======
    function renderSettings() {
        const cfg = DataStore.getConfig();
        return `
            <div class="card"><div class="card-body">
                <div class="form-group"><label>Minimum Attendance %</label><input id="cfgMinAtt" type="number" value="${cfg.minAttendance}" min="0" max="100"></div>
                <div class="form-group"><label>Late Grace (minutes)</label><input id="cfgGrace" type="number" value="${cfg.lateGraceMinutes}" min="0"></div>
                <button class="btn btn-primary" onclick="App.saveSettings()">Save Settings</button>
                <button class="btn btn-danger mt-8" onclick="App.resetAllData()">Reset All Data</button>
            </div></div>`;
    }

    function saveSettings() {
        const min = parseInt(document.getElementById('cfgMinAtt').value);
        const grace = parseInt(document.getElementById('cfgGrace').value);
        DataStore.updateConfig({ minAttendance: min, lateGraceMinutes: grace });
        alert('Settings saved!');
    }

    function resetAllData() {
        if (confirm('⚠️ This will erase ALL data and reload defaults. Continue?')) {
            DataStore.resetData();
            window.location.reload();
        }
    }

    // ====== Teacher: My Course ======
    function renderTeacherCourse() {
        const user = getCurrentUser();
        const enrolled = DataStore.getStudentsInCourse(user.courseCode);
        const notEnrolled = DataStore.getStudentsNotInCourse(user.courseCode);

        const enrolledRows = enrolled.map(s => `
            <tr>
                <td>${s.rollno}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.email}</td>
                <td>${s.batch}</td>
                <td><button class="btn btn-sm btn-danger" onclick="App.removeStudentFromTeacherCourse('${s.id}')">Remove</button></td>
            </tr>`).join('');

        const addOptions = notEnrolled.map(s => `<option value="${s.id}">${s.name} (${s.rollno})</option>`).join('');

        return `
            <div class="card"><div class="card-header"><h3>${user.course} (${user.courseCode})</h3><span class="badge badge-teal">${enrolled.length} Students</span></div>
            <div class="card-body">
                ${notEnrolled.length > 0 ? `
                    <div class="flex-between mb-16">
                        <select id="studentToAdd" class="filter-select" style="flex:1;">${addOptions}</select>
                        <button class="btn btn-primary" onclick="App.enrollStudentToCourse()">+ Enroll Student</button>
                    </div>` : '<p class="text-muted mb-16">All students are enrolled in your course.</p>'}
                <div class="table-container"><table><thead><tr><th>Roll No</th><th>Name</th><th>Email</th><th>Batch</th><th>Action</th></tr></thead><tbody>${enrolledRows || '<tr><td colspan="5" class="text-center text-muted">No students enrolled</td></tr>'}</tbody></table></div>
            </div></div>`;
    }

    function enrollStudentToCourse() {
        const user = getCurrentUser();
        const studentId = document.getElementById('studentToAdd').value;
        if (studentId) {
            DataStore.enrollStudentInCourse(studentId, user.courseCode);
            navigateTo('my-course');
        }
    }

    function removeStudentFromTeacherCourse(studentId) {
        const user = getCurrentUser();
        if (confirm('Remove this student from your course?')) {
            DataStore.removeStudentFromCourse(studentId, user.courseCode);
            navigateTo('my-course');
        }
    }

    // ====== Teacher: Mark Attendance ======
    function renderMarkAttendance() {
        const user = getCurrentUser();
        const enrolled = DataStore.getStudentsInCourse(user.courseCode);
        const today = new Date().toISOString().split('T')[0];
        return `
            <div class="card"><div class="card-header"><h3>Mark Attendance</h3></div>
            <div class="card-body">
                <div class="action-bar mb-16">
                    <div class="action-bar-left">
                        <label style="font-weight:600;font-size:0.85rem;">Select Date:</label>
                        <input type="date" id="attDatePicker" class="filter-select" value="${today}" onchange="App.refreshMarkAttendanceGrid()">
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success" onclick="App.markAll('present')">All Present</button>
                        <button class="btn btn-sm btn-danger" onclick="App.markAll('absent')">All Absent</button>
                    </div>
                </div>
                <div class="attendance-grid" id="attendanceGrid"></div>
            </div></div>`;
    }

    function refreshMarkAttendanceGrid() {
        const user = getCurrentUser();
        const enrolled = DataStore.getStudentsInCourse(user.courseCode);
        const pickerDate = document.getElementById('attDatePicker')?.value || new Date().toISOString().split('T')[0];
        const grid = document.getElementById('attendanceGrid');
        if (!grid) return;

        const cards = enrolled.map(s => {
            const existing = DataStore.getAttendanceByDate(pickerDate).find(a => a.studentId === s.id && a.courseCode === user.courseCode);
            const currentStatus = existing ? existing.status : '';
            return `
                <div class="attendance-student-card">
                    <div class="student-name">${s.name}<br><span class="text-muted">${s.rollno}</span></div>
                    <div class="attendance-options">
                        <button class="att-option att-present ${currentStatus === 'present' ? 'selected' : ''}" onclick="App.markSingle('${s.id}','present',this)">Present</button>
                        <button class="att-option att-absent ${currentStatus === 'absent' ? 'selected' : ''}" onclick="App.markSingle('${s.id}','absent',this)">Absent</button>
                        <button class="att-option att-late ${currentStatus === 'late' ? 'selected' : ''}" onclick="App.markSingle('${s.id}','late',this)">Late</button>
                    </div>
                </div>`;
        }).join('');

        grid.innerHTML = cards || '<div class="empty-state"><div class="empty-state-icon">📚</div><h4>No students enrolled</h4><p>Enroll students first from My Course</p></div>';
    }

    function markSingle(studentId, status, btn) {
        const user = getCurrentUser();
        const pickerDate = document.getElementById('attDatePicker')?.value || new Date().toISOString().split('T')[0];
        DataStore.markAttendance(studentId, user.id, user.courseCode, pickerDate, status, '');

        const card = btn.closest('.attendance-student-card');
        card.querySelectorAll('.att-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }

    function markAll(status) {
        const user = getCurrentUser();
        const enrolled = DataStore.getStudentsInCourse(user.courseCode);
        const pickerDate = document.getElementById('attDatePicker')?.value || new Date().toISOString().split('T')[0];

        enrolled.forEach(s => {
            DataStore.markAttendance(s.id, user.id, user.courseCode, pickerDate, status, '');
        });

        document.querySelectorAll('.att-option').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll(`.att-${status}`).forEach(b => b.classList.add('selected'));
    }

    // ====== Teacher: View Attendance ======
    function renderViewAttendance() {
        const user = getCurrentUser();
        const today = new Date().toISOString().split('T')[0];

        const filterStyles = `
            <div class="action-bar">
                <div class="action-bar-left">
                    <select class="filter-select" id="attFilterMode" onchange="App.loadTeacherAttendanceView()">
                        <option value="day">By Day</option>
                        <option value="month">By Month</option>
                        <option value="year">By Year</option>
                    </select>
                    <label style="font-weight:600;font-size:0.85rem;">Select Date:</label>
                    <input type="date" id="attDateFilter" class="filter-select" value="${today}" onchange="App.loadTeacherAttendanceView()">
                </div>
            </div>`;
        const table = '<div class="card" id="attViewTable"><div class="table-container"><table><thead><tr><th>Roll No</th><th>Name</th><th>Date</th><th>Status</th></tr></thead><tbody id="attViewBody"></tbody></table></div></div>';

        return `${filterStyles}${table}`;
    }

    function loadTeacherAttendanceView() {
        const user = getCurrentUser();
        const mode = document.getElementById('attFilterMode')?.value || 'day';
        const dateVal = document.getElementById('attDateFilter')?.value || new Date().toISOString().split('T')[0];
        const records = DataStore.getAttendanceByTeacher(user.id);
        const students = DataStore.getStudents();
        let filtered = [];

        if (mode === 'day') {
            filtered = records.filter(r => r.date === dateVal);
        } else if (mode === 'month') {
            const month = dateVal.substring(0, 7);
            filtered = records.filter(r => r.date.startsWith(month));
        } else {
            const year = dateVal.substring(0, 4);
            filtered = records.filter(r => r.date.startsWith(year));
        }

        const body = document.getElementById('attViewBody');
        if (!body) return;

        const rows = filtered.map(r => {
            const s = students.find(st => st.id === r.studentId);
            const statusBadge = r.status === 'present' ? 'badge-green' : r.status === 'absent' ? 'badge-red' : 'badge-amber';
            return `<tr>
                <td>${s ? s.rollno : '-'}</td>
                <td>${s ? s.name : '-'}</td>
                <td>${r.date}</td>
                <td><span class="badge ${statusBadge}">${r.status}</span></td>
            </tr>`;
        }).join('');

        body.innerHTML = rows || '<tr><td colspan="4" class="text-center text-muted">No records found</td></tr>';
    }

    // ====== Teacher: Student Data ======
    function renderStudentData() {
        const user = getCurrentUser();
        const enrolled = DataStore.getStudentsInCourse(user.courseCode);

        const rows = enrolled.map(s => {
            const stats = DataStore.getAttendanceStats(s.id, user.courseCode);
            const barColor = parseFloat(stats.percentage) >= 75 ? 'green' : parseFloat(stats.percentage) >= 50 ? 'amber' : 'red';
            return `<tr>
                <td>${s.rollno}</td>
                <td><strong>${s.name}</strong></td>
                <td>${stats.total}</td>
                <td>${stats.present}</td>
                <td>${stats.absent}</td>
                <td>${stats.late}</td>
                <td>
                    <span style="font-weight:600;color:var(--${parseFloat(stats.percentage) >= 75 ? 'mint' : parseFloat(stats.percentage) >= 50 ? '#b8860b' : '--crimson'})">${stats.percentage}%</span>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill ${barColor}" style="width:${stats.percentage}%"></div></div>
                </td>
            </tr>`;
        }).join('');

        return `<div class="card"><div class="table-container"><table><thead><tr><th>Roll No</th><th>Name</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance %</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-center text-muted">No students enrolled</td></tr>'}</tbody></table></div></div>`;
    }

    // ====== Student: My Attendance ======
    function renderStudentMyAttendance() {
        const user = getCurrentUser();
        const today = new Date().toISOString().split('T')[0];

        const filterStyles = `
            <div class="action-bar">
                <div class="action-bar-left">
                    <select class="filter-select" id="stuAttMode" onchange="App.loadStudentAttendanceView()">
                        <option value="day">By Day</option>
                        <option value="month">By Month</option>
                        <option value="year">By Year</option>
                    </select>
                    <label style="font-weight:600;font-size:0.85rem;">Select Date:</label>
                    <input type="date" id="stuAttDate" class="filter-select" value="${today}" onchange="App.loadStudentAttendanceView()">
                </div>
            </div>`;

        const table = `<div class="card" id="stuAttTable"><div class="table-container"><table><thead><tr><th>Date</th><th>Course</th><th>Status</th></tr></thead><tbody id="stuAttBody"></tbody></table></div></div>`;

        return `${filterStyles}${table}`;
    }

    function loadStudentAttendanceView() {
        const user = getCurrentUser();
        const mode = document.getElementById('stuAttMode')?.value || 'day';
        const dateVal = document.getElementById('stuAttDate')?.value || new Date().toISOString().split('T')[0];
        const records = DataStore.getAttendanceByStudent(user.id);
        const teachers = DataStore.getTeachers();
        let filtered = [];

        if (mode === 'day') {
            filtered = records.filter(r => r.date === dateVal);
        } else if (mode === 'month') {
            const month = dateVal.substring(0, 7);
            filtered = records.filter(r => r.date.startsWith(month));
        } else {
            const year = dateVal.substring(0, 4);
            filtered = records.filter(r => r.date.startsWith(year));
        }

        const body = document.getElementById('stuAttBody');
        if (!body) return;

        const rows = filtered.map(r => {
            const t = teachers.find(t => t.courseCode === r.courseCode);
            const statusBadge = r.status === 'present' ? 'badge-green' : r.status === 'absent' ? 'badge-red' : 'badge-amber';
            return `<tr>
                <td>${r.date}</td>
                <td>${t ? t.course : r.courseCode}</td>
                <td><span class="badge ${statusBadge}">${r.status}</span></td>
            </tr>`;
        }).join('');

        body.innerHTML = rows || '<tr><td colspan="3" class="text-center text-muted">No records found</td></tr>';
    }

    // ====== Student: Course Breakdown ======
    function renderStudentCourseBreakdown() {
        const user = getCurrentUser();
        const student = DataStore.getStudents().find(s => s.id === user.id);
        const courses = student ? student.courses : [];
        const allTeachers = DataStore.getTeachers();

        const rows = courses.map(code => {
            const t = allTeachers.find(t => t.courseCode === code);
            const stats = DataStore.getAttendanceStats(user.id, code);
            const barColor = parseFloat(stats.percentage) >= 75 ? 'green' : parseFloat(stats.percentage) >= 50 ? 'amber' : 'red';
            return `<tr>
                <td>${t ? t.course : code}</td>
                <td><span class="badge badge-teal">${code}</span></td>
                <td>${stats.total}</td>
                <td><span class="badge badge-green">${stats.present}</span></td>
                <td><span class="badge badge-red">${stats.absent}</span></td>
                <td><span class="badge badge-amber">${stats.late}</span></td>
                <td>
                    <strong>${stats.percentage}%</strong>
                    <div class="progress-bar-wrap"><div class="progress-bar-fill ${barColor}" style="width:${stats.percentage}%"></div></div>
                </td>
            </tr>`;
        }).join('');

        const stats = DataStore.getAttendanceStats(user.id);
        const overallColor = parseFloat(stats.percentage) >= 75 ? 'green' : parseFloat(stats.percentage) >= 50 ? 'amber' : 'red';

        return `
            <div class="card"><div class="card-body">
                <h3>Overall Attendance: <span style="color:var(--${overallColor === 'green' ? 'mint' : overallColor === 'amber' ? '#b8860b' : '--crimson'})">${stats.percentage}%</span></h3>
                <div class="progress-bar-wrap mt-8" style="height:12px;"><div class="progress-bar-fill ${overallColor}" style="width:${stats.percentage}%"></div></div>
                <p class="text-muted mt-8">${stats.total} total | ${stats.present} present | ${stats.absent} absent | ${stats.late} late</p>
            </div></div>
            <div class="card mt-20"><div class="table-container"><table><thead><tr><th>Course</th><th>Code</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>Percentage</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-center text-muted">No courses enrolled</td></tr>'}</tbody></table></div></div>`;
    }

    // ====== Student: Charts ======
    function renderStudentCharts() {
        return `
            <div class="grid-2">
                <div class="chart-card"><h3>Overall Attendance Distribution</h3><div class="chart-wrap"><canvas id="chPie"></canvas></div></div>
                <div class="chart-card"><h3>Monthly Attendance Trend</h3><div class="chart-wrap"><canvas id="chLine"></canvas></div></div>
                <div class="chart-card"><h3>Course-wise Attendance</h3><div class="chart-wrap"><canvas id="chBar"></canvas></div></div>
                <div class="chart-card"><h3>Per-Course Distribution</h3><div class="chart-wrap"><canvas id="chDoughnut"></canvas></div></div>
            </div>`;
    }

    // ====== Page Event Setup ======
    function setupPageEvents() {
        const user = getCurrentUser();

        // Teacher search
        const teacherSearch = document.getElementById('teacherSearch');
        if (teacherSearch) {
            teacherSearch.addEventListener('input', function() {
                const q = this.value.toLowerCase();
                document.querySelectorAll('#teacherTableBody tr').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }

        // Student search
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', function() {
                const q = this.value.toLowerCase();
                document.querySelectorAll('#studentTableBody tr').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }

        // Teacher attendance filters
        const attFilterMode = document.getElementById('attFilterMode');
        const attDateFilter = document.getElementById('attDateFilter');
        if (attFilterMode && attDateFilter) {
            attFilterMode.addEventListener('change', loadTeacherAttendanceView);
            attDateFilter.addEventListener('change', loadTeacherAttendanceView);
            loadTeacherAttendanceView();
        }

        // Teacher mark attendance grid
        if (currentPage === 'mark-attendance') {
            refreshMarkAttendanceGrid();
        }

        // Student attendance filters
        const stuAttMode = document.getElementById('stuAttMode');
        const stuAttDate = document.getElementById('stuAttDate');
        if (stuAttMode && stuAttDate) {
            stuAttMode.addEventListener('change', loadStudentAttendanceView);
            stuAttDate.addEventListener('change', loadStudentAttendanceView);
            loadStudentAttendanceView();
        }

        // Charts
        if (currentPage === 'overview') {
            if (user.role === 'admin') buildAdminOverviewCharts();
            else if (user.role === 'teacher') buildTeacherOverviewCharts();
            else buildStudentOverviewCharts();
        }
        if (currentPage === 'charts-view') buildStudentCharts();
    }

    // ====== Chart Builders ======
    function buildAdminOverviewCharts() {
        const teachers = DataStore.getTeachers();
        const ctx1 = document.getElementById('chartTeacherDist');
        if (ctx1) {
            charts.chartTeacherDist = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: teachers.map(t => t.course),
                    datasets: [{
                        label: 'Teachers per Course',
                        data: teachers.map(() => 1),
                        backgroundColor: chartColors.mutedCoral,
                        borderColor: chartColors.coral,
                        borderWidth: 2, borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }
        const ctx2 = document.getElementById('chartSystemStats');
        if (ctx2) {
            charts.chartSystemStats = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Teachers', 'Students', 'Attendance Records', 'Courses'],
                    datasets: [{
                        data: [DataStore.getTeachers().length, DataStore.getStudents().length, DataStore.getAttendanceByDate(new Date().toISOString().split('T')[0]).length, 5],
                        backgroundColor: [chartColors.coral, chartColors.teal, chartColors.mint, chartColors.amber],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    function buildTeacherOverviewCharts() {
        const user = getCurrentUser();
        const records = DataStore.getAttendanceByTeacher(user.id);
        const present = records.filter(a => a.status === 'present').length;
        const absent = records.filter(a => a.status === 'absent').length;
        const late = records.filter(a => a.status === 'late').length;

        const ctx1 = document.getElementById('chartAttDist');
        if (ctx1) {
            charts.chartAttDist = new Chart(ctx1, {
                type: 'pie',
                data: {
                    labels: ['Present', 'Absent', 'Late'],
                    datasets: [{
                        data: [present, absent, late],
                        backgroundColor: [chartColors.mint, chartColors.crimson, chartColors.amber],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctx2 = document.getElementById('chartMonthlyTrend');
        if (ctx2) {
            const monthly = {};
            records.forEach(r => {
                const m = r.date.substring(0, 7);
                if (!monthly[m]) monthly[m] = { present: 0, absent: 0, late: 0, total: 0 };
                monthly[m][r.status]++; monthly[m].total++;
            });
            const sorted = Object.entries(monthly).sort((a,b) => a[0].localeCompare(b[0]));
            charts.chartMonthlyTrend = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: sorted.map(e => e[0]),
                    datasets: [{
                        label: 'Present %',
                        data: sorted.map(e => e[1].total > 0 ? ((e[1].present / e[1].total) * 100).toFixed(1) : 0),
                        borderColor: chartColors.mint, backgroundColor: chartColors.mutedMint, fill: true, tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
            });
        }
    }

    function buildStudentOverviewCharts() {
        const user = getCurrentUser();
        const records = DataStore.getAttendanceByStudent(user.id);
        const present = records.filter(a => a.status === 'present').length;
        const absent = records.filter(a => a.status === 'absent').length;
        const late = records.filter(a => a.status === 'late').length;

        const ctx1 = document.getElementById('chartAttPie');
        if (ctx1) {
            charts.chartAttPie = new Chart(ctx1, {
                type: 'pie',
                data: {
                    labels: ['Present', 'Absent', 'Late'],
                    datasets: [{
                        data: [present, absent, late],
                        backgroundColor: [chartColors.mint, chartColors.crimson, chartColors.amber],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctx2 = document.getElementById('chartMonthlyStTrend');
        if (ctx2) {
            const monthly = {};
            records.forEach(r => {
                const m = r.date.substring(0, 7);
                if (!monthly[m]) monthly[m] = { present: 0, absent: 0, total: 0 };
                monthly[m][r.status]++; monthly[m].total++;
            });
            const sorted = Object.entries(monthly).sort((a,b) => a[0].localeCompare(b[0]));
            charts.chartMonthlyStTrend = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: sorted.map(e => e[0]),
                    datasets: [{
                        label: 'Present %',
                        data: sorted.map(e => e[1].total > 0 ? ((e[1].present / e[1].total) * 100).toFixed(1) : 0),
                        borderColor: chartColors.mint, backgroundColor: chartColors.mutedMint, fill: true, tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
            });
        }
    }

    function buildStudentCharts() {
        const user = getCurrentUser();
        const records = DataStore.getAttendanceByStudent(user.id);
        const present = records.filter(a => a.status === 'present').length;
        const absent = records.filter(a => a.status === 'absent').length;
        const late = records.filter(a => a.status === 'late').length;
        const student = DataStore.getStudents().find(s => s.id === user.id);
        const courses = student ? student.courses : [];
        const teachers = DataStore.getTeachers();

        const ctx1 = document.getElementById('chPie');
        if (ctx1) {
            charts.chPie = new Chart(ctx1, {
                type: 'pie',
                data: {
                    labels: ['Present', 'Absent', 'Late'],
                    datasets: [{ data: [present, absent, late], backgroundColor: [chartColors.mint, chartColors.crimson, chartColors.amber], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctx2 = document.getElementById('chLine');
        if (ctx2) {
            const monthly = {};
            records.forEach(r => {
                const m = r.date.substring(0, 7);
                if (!monthly[m]) monthly[m] = { present: 0, total: 0 };
                monthly[m][r.status]++; monthly[m].total++;
            });
            const sorted = Object.entries(monthly).sort((a,b) => a[0].localeCompare(b[0]));
            charts.chLine = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: sorted.map(e => e[0]),
                    datasets: [{
                        label: 'Present %', data: sorted.map(e => e[1].total > 0 ? ((e[1].present / e[1].total) * 100).toFixed(1) : 0),
                        borderColor: chartColors.mint, backgroundColor: chartColors.mutedMint, fill: true, tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
            });
        }

        const ctx3 = document.getElementById('chBar');
        if (ctx3 && courses.length) {
            const courseData = courses.map(code => {
                const stats = DataStore.getAttendanceStats(user.id, code);
                return parseFloat(stats.percentage);
            });
            const courseLabels = courses.map(code => {
                const t = teachers.find(t => t.courseCode === code);
                return t ? t.course : code;
            });
            charts.chBar = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: courseLabels,
                    datasets: [{
                        label: 'Attendance %', data: courseData,
                        backgroundColor: chartColors.mutedCoral, borderColor: chartColors.coral, borderWidth: 2, borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
            });
        }

        const ctx4 = document.getElementById('chDoughnut');
        if (ctx4 && courses.length) {
            const courseData = courses.map(code => parseFloat(DataStore.getAttendanceStats(user.id, code).percentage));
            const courseLabels = courses.map(code => {
                const t = teachers.find(t => t.courseCode === code);
                return t ? t.course : code;
            });
            charts.chDoughnut = new Chart(ctx4, {
                type: 'doughnut',
                data: {
                    labels: courseLabels,
                    datasets: [{ data: courseData, backgroundColor: [chartColors.coral, chartColors.teal, chartColors.mint, chartColors.amber, chartColors.navy], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // ====== Modal Helpers ======
    function openModal() { document.getElementById('modalOverlay').classList.add('show'); }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

    // ====== Init ======
    document.addEventListener('DOMContentLoaded', init);

    return {
        init, navigateTo, showAddTeacherModal, editTeacher, saveTeacher, updateTeacherRecord, deleteTeacher,
        showAddStudentModal, editStudent, saveStudent, updateStudentRecord, deleteStudent,
        postAnnouncement, saveSettings, resetAllData,
        enrollStudentToCourse, removeStudentFromTeacherCourse,
        markSingle, markAll,
        closeModal
    };
})();
