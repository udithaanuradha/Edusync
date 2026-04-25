export interface ApprovedRequestMember {
  id: number;
  name: string;
  university_id: string;
  email?: string;
  level?: number;
}

export interface ApprovedGroupRequest {
  id: number;
  projectName: string;
  groupName: string;
  groupLeader: string;
  membersList: string;
  supervisorName: string;
  studentId?: number;
  projectLevel?: number;
  resolvedMembers?: ApprovedRequestMember[];
}
