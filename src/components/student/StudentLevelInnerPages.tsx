import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CoordinatorStageUpdates from "./CoordinatorStageUpdates";
import GroupRequest from "./GroupRequest";
import StudentSubmissions from "./StudentSubmissions";
import "./StudentLevelInnerPages.css";

const tabItems = [
  { key: "projectStates", label: "Project States" },
  { key: "groupFormation", label: "Group Formation" },
  { key: "groups", label: "Groups" },
  { key: "submissions", label: "Submissions" },
] as const;

type TabKey = (typeof tabItems)[number]["key"];

type GroupItem = {
  id: number | string;
  name: string;
  status: string;
  members: string;
  supervisor: string;
  groupLeader: string;
};

const StudentLevelInnerPages: React.FC<{ levelNumber: number }> = ({
  levelNumber,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("projectStates");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab !== "groups") return;

    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    if (!user?.id) {
      setGroups([]);
      return;
    }

    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/groups/student-group/${user.id}/${levelNumber}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          setGroups([]);
          return;
        }

        const data = await response.json();
        if (import.meta.env.DEV) console.log('[StudentLevelInnerPages] raw groups payload', data);
        const rawItems = Array.isArray(data)
          ? data
          : Array.isArray(data.groups)
            ? data.groups
            : Array.isArray(data.requests)
              ? data.requests
              : [data];

        setGroups(
          rawItems.map((item: any, index: number) => ({
            id:
              item.id ??
              item.group_id ??
              item.request_id ??
              item.groupId ??
              index,
            name:
              item.group_name ??
              item.groupName ??
              item.group ??
              `Group ${index + 1}`,
            status:
              item.status ??
              item.group_status ??
              item.request_status ??
              "Pending",
            members: Array.isArray(item.members)
              ? item.members.map((m: any) => typeof m === "string" ? m : m.name).join(", ")
              : (item.members_list ?? item.members ?? "Not available"),
            supervisor:
              item.supervisor_name ??
              item.supervisor ??
              item.supervisor_id ??
              "TBD",
            groupLeader:
              item.leader ??
              item.group_leader ??
              item.groupLeader ??
              "Not Assigned",
          })),
        );
      } catch (error) {
        console.error("Unable to load student groups", error);
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "projectStates":
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Project States</h3>
              <p>
                Review your current project status and phase updates for Level{" "}
                {levelNumber}.
              </p>
            </div>
            <CoordinatorStageUpdates levelNumber={levelNumber} />
          </div>
        );

      case "groupFormation":
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Group Formation</h3>
              <p>
                Submit a new project group formation request, select a
                supervisor, and track your request status.
              </p>
            </div>
            <GroupRequest levelNumber={levelNumber} />
          </div>
        );

      case "groups":
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Groups</h3>
              <p>
                See your current groups and membership details for Level{" "}
                {levelNumber}.
              </p>
            </div>
            <div className="student-groups-wrapper">
              {loadingGroups ? (
                <div className="student-tab-empty">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="student-tab-empty">
                  No registered groups were found for your account yet. Use the
                  Group Formation tab to create one.
                </div>
              ) : (
                <div className="student-groups-grid">
                  {groups.map((group) => (
                    <div key={group.id} className="student-group-card">
                      <div className="group-card-header">
                        <h4>{group.name}</h4>
                        <span className="group-status-badge">
                          {group.status}
                        </span>
                      </div>
                      <div className="group-card-body">
                        <p className="group-meta">
                          <strong>Supervisor:</strong> {group.supervisor}
                        </p>
                        <p className="group-meta">
                          <strong>Group Leader:</strong> {group.groupLeader}
                        </p>
                        <p className="group-meta">
                          <strong>Members:</strong> {group.members}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {groups.length > 0 && (
                <div className="manage-project-section">
                  <button
                    className="manage-project-btn"
                    onClick={() => {
                      const userString = localStorage.getItem("user");
                      const user = userString ? JSON.parse(userString) : null;
                      const currentUserName = String(user?.name || "").trim().toLowerCase();
                      const targetGroup =
                        groups.find(
                          (group) =>
                            String(group.groupLeader || "").trim().toLowerCase() === currentUserName,
                        ) || groups[0];

                      navigate("/student/project-management", {
                        state: {
                          level: levelNumber,
                          groupId: targetGroup.id,
                          groupLeader: targetGroup.groupLeader,
                        },
                      });
                    }}
                  >
                    Start Manage the Project
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case "submissions":
        return <StudentSubmissions levelNumber={levelNumber} />;

      default:
        return null;
    }
  };

  return (
    <div className="student-inner-pages">
      <div className="student-inner-tabs">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            className={`student-inner-tab ${activeTab === tab.key ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="student-inner-content">
        <div className="student-inner-panel">{renderContent()}</div>
      </div>
    </div>
  );
};

export default StudentLevelInnerPages;
