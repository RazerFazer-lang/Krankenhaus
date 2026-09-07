export type Priority = 'Rot' | 'Gelb' | 'Grün';
export type PatientStatus = 'Wartebereich' | 'Triage' | 'Diagnostik' | 'Behandlung' | 'OP-Vorbereitung' | 'OP' | 'Stationär' | 'Entlassung';
export type Department = 'Notaufnahme' | 'Chirurgie' | 'Innere Medizin' | 'Anästhesie' | 'Intensivstation' | 'Radiologie' | 'Kardiologie' | 'Pädiatrie' | 'Labor' | 'Apotheke' | 'Hygiene';
export type StaffRole = 'Oberarzt' | 'Facharzt' | 'Assistenzarzt' | 'Pflegefachkraft' | 'MTRA' | 'MTLA' | 'Anästhesist' | 'OP-Pflege' | 'Physiotherapie' | 'Verwaltung';
export type StaffStatus = 'Im Dienst' | 'Behandlung' | 'OP' | 'Pause' | 'Abwesend';
export type BedStatus = 'Frei' | 'Belegt' | 'Reinigung' | 'Gesperrt';
export type PlayerRole = 'Ärztlicher Dienst' | 'Pflegedienst' | 'OP-Team' | 'Aufnahme' | 'Verwaltung';

export interface VitalSigns { pulse: number; systolic: number; diastolic: number; spo2: number; temperature: number; pain: number; consciousness: number; }
export interface Patient {
  id: number; name: string; age: number; sex: 'm' | 'w' | 'd'; condition: string; diagnosis: string; priority: Priority; status: PatientStatus;
  department: Department; arrival: number; vitals: VitalSigns; notes: string; allergies: string[]; medications: string[]; tests: string[]; treatments: string[];
  assignedDoctorId?: number; assignedNurseId?: number; bedId?: string; prognosis: number; operation?: string;
}
export interface Staff { id: number; name: string; role: StaffRole; department: Department; status: StaffStatus; patientId?: number; skill: number; shiftEnd: number; }
export interface Bed { id: string; department: Department; status: BedStatus; patientId?: number; isolation?: boolean; cleanAt?: number; }
export interface Task { id: string; label: string; detail: string; department: Department; priority: Priority; patientId?: number; assignedTo?: number; done: boolean; created: number; }
export interface HospitalEvent { id: string; at: number; type: 'patient' | 'staff' | 'system' | 'critical' | 'diagnostic' | 'operation'; text: string; patientId?: number; }
export interface DepartmentState { name: Department; type: string; capacity: number; open: boolean; occupancy: number; staff: number; demand: number; }
export interface Player { id: string; name: string; role: PlayerRole; connectedAt: number; lastSeen: number; }
export interface HospitalState { time: number; money: number; reputation: number; patients: Patient[]; staff: Staff[]; beds: Bed[]; tasks: Task[]; events: HospitalEvent[]; departments: DepartmentState[]; players: Player[]; day: number; weather: string; }

export type ClientAction =
  | { type: 'createPatient' }
  | { type: 'triage'; patientId: number; priority: Priority }
  | { type: 'vitals'; patientId: number; vitals: Partial<VitalSigns> }
  | { type: 'diagnosis'; patientId: number; diagnosis: string }
  | { type: 'test'; patientId: number; test: string; department: Department }
  | { type: 'treatment'; patientId: number; treatment: string }
  | { type: 'assign'; patientId: number; staffId: number; kind: 'doctor' | 'nurse' }
  | { type: 'admit'; patientId: number; department: Department }
  | { type: 'prepareOperation'; patientId: number; operation: string }
  | { type: 'startOperation'; patientId: number }
  | { type: 'finishOperation'; patientId: number }
  | { type: 'discharge'; patientId: number }
  | { type: 'cleanBed'; bedId: string }
  | { type: 'toggleDepartment'; department: Department; open: boolean }
  | { type: 'addTask'; label: string; detail: string; department: Department; priority: Priority; patientId?: number }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'callStaff'; role: StaffRole }
  | { type: 'houseAlarm' };

export interface ServerToClientEvents { state: (state: HospitalState) => void; error: (message: string) => void; notice: (message: string) => void; }
export interface ClientToServerEvents { join: (payload: { name: string; role: PlayerRole }) => void; action: (action: ClientAction) => void; pingState: () => void; }
