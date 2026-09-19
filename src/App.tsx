import React, { useState, useEffect } from 'react';
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
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [preselectedSchoolForSubmission, setPreselectedSchoolForSubmission] = useState<School | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<any>(null);

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
    const reportError = () => setDataError('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อและสิทธิ์ แล้วโหลดหน้าใหม่');
    // Subscribe to schools
    const unsubSchools = onSnapshot(
      query(collection(db, 'schools'), orderBy('schoolName', 'asc')),
      (snapshot) => {
        const list: School[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setSchools(list);
        setDataLoaded(true);
      },
      (err) => {
        reportError();
        setDataLoaded(true);
      }
    );

    // Subscribe to documentSubmissions
    const unsubSubmissions = onSnapshot(
      query(collection(db, 'documentSubmissions'), orderBy('submissionDate', 'desc')),
      (snapshot) => {
        const list: DocumentSubmission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setSubmissions(list);
      },
      reportError
    );

    // Subscribe to appointments
    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'asc')),
      (snapshot) => {
        const list: Appointment[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setAppointments(list);
      },
      reportError
    );

    // Subscribe to fieldTrips
    const unsubFieldTrips = onSnapshot(
      query(collection(db, 'fieldTrips'), orderBy('date', 'desc')),
      (snapshot) => {
        const list: FieldTrip[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setFieldTrips(list);
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
    setPreselectedSchoolForSubmission(school);
    setIsSubmissionModalOpen(true);
  };

  const handleOpenAppointmentForSchool = (school: School) => {
    const latestSubmission = submissions.find((sub) => sub.schoolId === school.id && !sub.appointmentId && !sub.fieldTripId);
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
    setPrefilledTripAppointment(appt);
    setIsFieldTripModalOpen(true);
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
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectAppointment={(appt) => setSelectedAppointmentForDetail(appt)}
          onNewSubmission={() => {
            setPreselectedSchoolForSubmission(null);
            setIsSubmissionModalOpen(true);
          }}
          onNewAppointment={() => {
            setPrefilledAppointmentData(null);
            setIsAppointmentModalOpen(true);
          }}
        />
      )}

      {activeTab === 'schools' && (
        <SchoolsView
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
          submissions={submissions}
          schools={schools}
          onOpenInstantAppointment={handleInstantAppointmentFromSubmission}
        />
      )}

      {activeTab === 'appointments' && (
        <AppointmentsView
          appointments={appointments}
          schools={schools}
          submissions={submissions}
          onRecordTrip={handleRecordTripFromAppointment}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarView
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
        />
      )}

      {activeTab === 'reports' && (
        <MonthlyReportsView
          schools={schools}
          submissions={submissions}
          appointments={appointments}
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
        isOpen={isSubmissionModalOpen}
        onClose={() => {
          setIsSubmissionModalOpen(false);
          setPreselectedSchoolForSubmission(null);
        }}
        schools={schools}
        preselectedSchool={preselectedSchoolForSubmission}
        onSave={async (data) => {
          return await createDocumentSubmission(data, currentUser);
        }}
        onOpenInstantAppointment={handleInstantAppointmentFromSubmission}
      />

      <AppointmentFormModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setPrefilledAppointmentData(null);
        }}
        schools={schools}
        submissions={submissions}
        prefilledData={prefilledAppointmentData}
        onSave={async (data) => {
          await createAppointment(data, currentUser);
        }}
      />

      {selectedAppointmentForDetail && (
        <AppointmentDetailModal
          appointment={selectedAppointmentForDetail}
          onClose={() => setSelectedAppointmentForDetail(null)}
          onEdit={(appt) => {
            setSelectedAppointmentForDetail(null);
            setPrefilledAppointmentData(appt);
            setIsAppointmentModalOpen(true);
          }}
          onRecordTrip={(appt) => {
            setSelectedAppointmentForDetail(null);
            handleRecordTripFromAppointment(appt);
          }}
        />
      )}

      <FieldTripFormModal
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
          await createFieldTrip(data, currentUser);
        }}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
