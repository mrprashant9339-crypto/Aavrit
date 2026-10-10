export type Membership = {
  userId: string;
  collegeId: string;
  role: string;
  status: string;
  department: string;
  branch: string;
  semester: string;
  section: string;
};

export type GroupScope = {
  collegeId: string;
  policy: string;
  department: string;
  branch: string;
  semester: string;
  section: string;
};

export const isStaff = (role: string) => ['teacher', 'hod', 'college_admin'].includes(role);

export function canJoinGroup(member: Membership, group: GroupScope) {
  if (member.status !== 'approved' || member.collegeId !== group.collegeId) return false;
  if (group.department && group.department !== member.department) return false;
  if (group.branch && group.branch !== member.branch) return false;
  if (group.semester && group.semester !== member.semester) return false;
  if (group.section && group.section !== member.section) return false;
  return true;
}

export function canReviewMembership(reviewer: Membership, applicant: Membership) {
  if (reviewer.status !== 'approved' || reviewer.collegeId !== applicant.collegeId) return false;
  if (reviewer.userId === applicant.userId || applicant.role === 'college_admin') return false;
  if (reviewer.role === 'college_admin') return ['student', 'teacher', 'hod'].includes(applicant.role);
  return reviewer.role === 'hod' && applicant.role === 'student' && Boolean(reviewer.department) && reviewer.department === applicant.department;
}

export function validFileType(bytes: Uint8Array) {
  if (bytes.length < 8) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, position) => bytes[position] === value)) return 'image/png';
  if (new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  return null;
}
