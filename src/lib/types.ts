export type TorqueStatus = "draft" | "needs_review" | "report_generated";

export type FieldConfidence = Partial<Record<keyof TorqueTagFields, number>>;

export type TorqueTagFields = {
  job_number: string | null;
  tag_number: string | null;
  inspected_by: string | null;
  inspected_date: string | null;
  torqued_by: string | null;
  torque_wrench_number: string | null;
  torque_applied_ftlbs: number | null;
  torque_date: string | null;
  gasket_type: string | null;
  flange_cleaned: boolean | null;
  installed_by: string | null;
  reinstall_date: string | null;
  disturbed_by: string | null;
  disturbed_date: string | null;
  ocr_confidence: number;
  field_confidence?: FieldConfidence;
  notes: string | null;
};

export type ReportFormData = TorqueTagFields & {
  worker_name: string;
  expected_torque_ftlbs: number | null;
  report_number: string;
  report_date: string;
  pembina_job_number: string;
  project_name: string;
  location: string;
  customer_flange_tag_number: string;
  drawing_number: string;
  flange_size: string;
  flange_class: string;
  flange_series: string;
  wrench_socket_size: string;
  lubrication: string;
  torque_value_specified: number | null;
  stud_material: string;
  nut_material: string;
  photo_file_name: string;
};

export type StoredFile = {
  fileName: string;
  originalName: string;
  url: string;
  createdAt: string;
};

export type TorqueRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: TorqueStatus;
  extracted: TorqueTagFields;
  confirmed?: ReportFormData;
  photo?: StoredFile;
  report?: StoredFile;
};

export type CertRecord = {
  id: string;
  createdAt: string;
  file: StoredFile;
};
