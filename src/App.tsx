import { getSchoolWorkflow, resolveSchoolRelation } from './utils/schoolStatus';
import { readSourceRecord, visibleSubmissions } from './utils/sourceRecords';
import type { DataReviewTarget } from './utils/dataCompleteness';
import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase/firebase';
import { School, DocumentSubmission, Appointment, FieldTrip, TeamId } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { AppLayout, ActiveTab } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { SchoolsView } from './components/schools/SchoolsView';
import { SubmissionsView } from './components/submissions/SubmissionsView';
import { SubmissionFormModal } from './components/submissions/SubmissionFormModal';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { CalendarView } from './components/appointments/CalendarView';
import { AppointmentFormModal } from './components/appointments/AppointmentFormModal';
import { AppointmentDetailModal } from './components/appointments/AppointmentDetailModal';
import { FieldTripsView } from './components/trips/FieldTripsView';
import { FieldTripFormModal } from './components/trips/FieldTripFormModal';
import { ActivityGalleryView } from './components/gallery/ActivityGalleryView';
import { MonthlyReportsView } from './components/reports/MonthlyReportsView';
import { SettingsView } from './components/settings/SettingsView';
import {
  createDocumentSubmission,
  createAppointment,
  createFieldTrip,
  updateFieldTrip,
  updateDocumentSubmission,
  updateAppointment,
} from './firebase/dbService';

function MainApplication() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Real-time Firestore state
  const [schools, setSchools] = useState<School[]>([]);
  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fieldTrips, setFieldTrips] = useState<FieldTrip[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Global modals and quick action state
  const [submissionToEdit, setSubmissionToEdit] = useState<DocumentSubmission | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [tripToEdit, setTripToEdit] = useState<FieldTrip | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [preselectedSchoolForSubmission, setPreselectedSchoolForSubmission] = useState<School | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<any>(null);

  const appointmentOpener = useRef<HTMLElement | null>(null);
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<Appointment | null>(null);

  const [isFieldTripModalOpen, setIsFieldTripModalOpen] = useState(false);
  const [prefilledTripAppointment, setPrefilledTripAppointment] = useState<Appointment | null>(null);

  // Seed on initial load if needed & subscribe to real-time updates when authenticated
  useEffect(() => {
    if (!currentUser) {
      setSchools([]);
      setSubmissions([]);
      setAppointments([]);
      setFieldTrips([]);
      setDataLoaded(false);
      return;
    }

    setDataError(null);
    setDataLoaded(false);
    const loaded = new Set<string>();
    const markLoaded = (name: string) => { loaded.add(name); setDataLoaded(loaded.size === 4); };
    const reportError = () => setDataError('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อและสิทธิ์ แล้วโหลดหน้าใหม่');
    // Subscribe to schools
    const unsubSchools = onSnapshot(
      collection(db, 'schools'),
      (snapshot) => {
        const list: School[] = [];
        snapshot.forEach((doc) => {
          list.push(readSourceRecord('schools', doc.id, doc.data()) as School);
        });
        setSchools(list.sort((a,b) => (a.schoolName || '').localeCompare(b.schoolName || '', 'th') || a.id.localeCompare(b.id)));
        markLoaded('schools');
      },
      (err) => {
        reportError();
      }
    );

    // Subscribe to documentSubmissions
    const unsubSubmissions = onSnapshot(
      collection(db, 'documentSubmissions'),
      (snapshot) => {
        const list: DocumentSubmission[] = [];
        snapshot.forEach((doc) => {
          list.push(readSourceRecord('documentSubmissions', doc.id, doc.data()) as DocumentSubmission);
        });
        setSubmissions(visibleSubmissions(list).sort((a,b) => (b.submissionDate || '').localeCompare(a.submissionDate || '', 'th') || a.id.localeCompare(b.id)));
        markLoaded('documentSubmissions');
      },
      reportError
    );

    // Subscribe to appointments
    const unsubAppointments = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const list: Appointment[] = [];
        snapshot.forEach((doc) => {
          list.push(readSourceRecord('appointments', doc.id, doc.data()) as Appointment);
        });
        setAppointments(list.sort((a,b) => (a.date || '').localeCompare(b.date || '', 'th') || a.id.localeCompare(b.id)));
        markLoaded('appointments');
      },
      reportError
    );

    // Subscribe to fieldTrips
    const unsubFieldTrips = onSnapshot(
      collection(db, 'fieldTrips'),
      (snapshot) => {
        const list: FieldTrip[] = [];
        snapshot.forEach((doc) => {
          list.push(readSourceRecord('fieldTrips', doc.id, doc.data()) as FieldTrip);
        });
        setFieldTrips(list.sort((a,b) => (b.date || '').localeCompare(a.date || '', 'th') || a.id.localeCompare(b.id)));
        markLoaded('fieldTrips');
      },
      reportError
    );

    return () => {
      unsubSchools();
      unsubSubmissions();
      unsubAppointments();
      unsubFieldTrips();
    };
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#087CC1] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 text-sm font-medium">กำลังโหลดข้อมูลระบบแนะแนว...</p>
      </div>
    );
  }

  // Not logged in -> Show official Login Page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Action Helpers:
  const handleOpenSubmissionForSchool = (school: School) => {
    setSubmissionToEdit(null);
    setPreselectedSchoolForSubmission(school);
    setIsSubmissionModalOpen(true);
  };

  const handleOpenAppointmentForSchool = (school: School) => {
    setAppointmentToEdit(null);
    const latestSubmission = getSchoolWorkflow(school, submissions, appointments, fieldTrips, schools).current.submissions.find(sub => !sub.appointmentId && !sub.fieldTripId && !appointments.some(a => a.submissionId === sub.id && a.status !== 'CANCELLED'));
    if (!latestSubmission) return;
    setPrefilledAppointmentData({
      submissionId: latestSubmission?.id,
      schoolId: school.id,
      schoolName: school.schoolName,
      teacherName: school.teacherName || '',
      teacherPhone: school.teacherPhone || '',
      teamId: school.teamId,
      vehicleId: latestSubmission?.vehicleId,
      vehicleName: latestSubmission?.vehicleName,
    });
    setIsAppointmentModalOpen(true);
  };

  const handleInstantAppointmentFromSubmission = (submissionData: {
    submissionId?: string;
    schoolId: string;
    schoolName: string;
    teacherName: string;
    teacherPhone: string;
    teamId: TeamId;
    vehicleId?: string;
    vehicleName?: string;
  }) => {
    setAppointmentToEdit(null);
    setPrefilledAppointmentData({
      submissionId: submissionData.submissionId,
      schoolId: submissionData.schoolId,
      schoolName: submissionData.schoolName,
      teacherName: submissionData.teacherName,
      teacherPhone: submissionData.teacherPhone,
      teamId: submissionData.teamId,
      vehicleId: submissionData.vehicleId,
      vehicleName: submissionData.vehicleName,
    });
    setIsAppointmentModalOpen(true);
  };

  const handleRecordTripFromAppointment = (appt: Appointment) => {
    setTripToEdit(null);
    setPrefilledTripAppointment(appt);
    setIsFieldTripModalOpen(true);
  };

  const handleReviewRecord = (target: DataReviewTarget) => {
    if (target.type === 'SUBMISSION') {
      const record = submissions.find(s => s.id === target.id);
      if (!record) return;
      setSubmissionToEdit(record); setPreselectedSchoolForSubmission(null); setIsSubmissionModalOpen(true);
    } else if (target.type === 'APPOINTMENT') {
      const record = appointments.find(a => a.id === target.id);
      if (!record) return;
      setAppointmentToEdit(record); setPrefilledAppointmentData(null); setIsAppointmentModalOpen(true);
    } else if (target.type === 'GUIDANCE') {
      const record = fieldTrips.find(t => t.id === target.id);
      if (!record) return;
      setTripToEdit(record); setPrefilledTripAppointment(null); setIsFieldTripModalOpen(true);
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {dataError && <div role="alert" className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{dataError}<button className="ml-3 underline" onClick={() => window.location.reload()}>โหลดใหม่</button></div>}
      {!dataLoaded && !dataError && <p role="status" className="p-4 text-slate-500">กำลังโหลดข้อมูล...</p>}
      {/* Dynamic Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardView
          schools={schools}
          appointments={appointments}
          fieldTrips={fieldTrips}
          submissions={submissions}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectAppointment={(appt) => setSelectedAppointmentForDetail(appt)}
        />
      )}

      {activeTab === 'schools' && (
        <SchoolsView
          onRecordTrip={handleRecordTripFromAppointment}
          onOpenAppointment={appt => {appointmentOpener.current = document.activeElement as HTMLElement; setSelectedAppointmentForDetail(appt);}}
          dataReady={dataLoaded && !dataError}
          onReviewRecord={handleReviewRecord}
          schools={schools}
          submissions={submissions}
          appointments={appointments}
          fieldTrips={fieldTrips}
          onNewSubmissionForSchool={handleOpenSubmissionForSchool}
          onNewAppointmentForSchool={handleOpenAppointmentForSchool}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsView
          fieldTrips={fieldTrips}
          submissions={submissions}
          schools={schools}
          appointments={appointments}
          onOpenInstantAppointment={handleInstantAppointmentFromSubmission}
          onSelectAppointment={(appt) => setSelectedAppointmentForDetail(appt)}
        />
      )}

      {activeTab === 'appointments' && (
        <AppointmentsView
          appointments={appointments}
          schools={schools}
          submissions={submissions}
          fieldTrips={fieldTrips}
          onRecordTrip={handleRecordTripFromAppointment}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarView
          fieldTrips={fieldTrips}
          appointments={appointments}
          schools={schools}
          submissions={submissions}
          onRecordTrip={handleRecordTripFromAppointment}
        />
      )}

      {activeTab === 'fieldTrips' && (
        <FieldTripsView
          fieldTrips={fieldTrips}
          schools={schools}
          submissions={submissions}
          appointments={appointments}
        />
      )}

      {activeTab === 'gallery' && (
        <ActivityGalleryView
          fieldTrips={fieldTrips}
          schools={schools}
          appointments={appointments}
          submissions={submissions}
        />
      )}

      {activeTab === 'reports' && (
        <MonthlyReportsView
          schools={schools}
          submissions={submissions}
          fieldTrips={fieldTrips}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          schools={schools}
          appointments={appointments}
        />
      )}

      {/* Global Modals for Seamless Cross-Module Workflows */}
      <SubmissionFormModal
        key={isSubmissionModalOpen ? submissionToEdit?.id || "new" : "closed"}
        submissionToEdit={submissionToEdit}
        isOpen={isSubmissionModalOpen}
        onClose={() => {
          setIsSubmissionModalOpen(false);
          setPreselectedSchoolForSubmission(null);
        }}
        schools={schools}
        preselectedSchool={preselectedSchoolForSubmission}
        onSave={async (data) => {
          if (submissionToEdit) { await updateDocumentSubmission(submissionToEdit.id, data, currentUser); return submissionToEdit.id; }
          return await createDocumentSubmission(data, currentUser);
        }}
        onOpenInstantAppointment={handleInstantAppointmentFromSubmission}
      />

      <AppointmentFormModal
        key={isAppointmentModalOpen ? appointmentToEdit?.id || "new" : "closed"}
        appointmentToEdit={appointmentToEdit}
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setPrefilledAppointmentData(null);
        }}
        schools={schools}
        submissions={submissions}
        prefilledData={prefilledAppointmentData}
        onSave={async (data) => {
          if (appointmentToEdit) { await updateAppointment(appointmentToEdit.id, data, currentUser); return; }
          await createAppointment(data, currentUser);
        }}
      />

      {selectedAppointmentForDetail && (
        <AppointmentDetailModal
          appointment={appointments.find(a=>a.id===selectedAppointmentForDetail.id) || selectedAppointmentForDetail}
          submissions={submissions}
          onClose={() => {setSelectedAppointmentForDetail(null); appointmentOpener.current?.focus();}}
          onEdit={(appt) => {
            setSelectedAppointmentForDetail(null);
            setAppointmentToEdit(appt);
            setPrefilledAppointmentData(null);
            setIsAppointmentModalOpen(true);
          }}
          onRecordTrip={(appt) => {
            setSelectedAppointmentForDetail(null);
            handleRecordTripFromAppointment(appt);
          }}
          fieldTrips={fieldTrips}
        />
      )}

      <FieldTripFormModal
        key={isFieldTripModalOpen ? tripToEdit?.id || "new" : "closed"}
        tripToEdit={tripToEdit}
        isOpen={isFieldTripModalOpen}
        onClose={() => {
          setIsFieldTripModalOpen(false);
          setPrefilledTripAppointment(null);
        }}
        schools={schools}
        submissions={submissions}
        appointments={appointments}
        prefilledAppointment={prefilledTripAppointment}
        onSave={async (data) => {
          if (tripToEdit) { await updateFieldTrip(tripToEdit.id, data, currentUser); return; }
          await createFieldTrip(data, currentUser);
        }}
      />
    </AppLayout>
  );
}

const LocalConfirmedReport = import.meta.env.DEV
  ? React.lazy(() => import('./components/reports/ConfirmedReportPreview'))
  : null;

export default function App() {
  if (LocalConfirmedReport && ['localhost','127.0.0.1'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('view') === 'confirmed-report') {
    return <React.Suspense fallback={<p>กำลังเปิดรายงาน...</p>}><LocalConfirmedReport /></React.Suspense>;
  }
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
