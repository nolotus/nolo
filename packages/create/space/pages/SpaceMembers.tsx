import "./SpaceMembers.css";
import React, { useEffect, useState } from "react";
import { useParams } from "app/routing";
import { useAppDispatch } from "app/store";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { toast } from "app/utils/toast";
import { toErrorMessage } from "core/errorMessage";
import { InviteModal } from "../components/InviteModal";
import { addMember, removeMember } from "../member/memberThunks";
import { MemberRole } from "app/types";
import { useSpaceData } from "../hooks/useSpaceData";
import {
  LuClock,
  LuPencil,
  LuPlus,
  LuShield,
  LuTrash2,
  LuUser,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import EmptyState from "../components/EmptyState";

interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  avatar?: string;
}

const roleLabelMap: Record<MemberRole, string> = {
  [MemberRole.OWNER]: "拥有者",
  [MemberRole.ADMIN]: "管理员",
  [MemberRole.MEMBER]: "成员",
  [MemberRole.GUEST]: "访客",
};

const roleIconMap: Record<MemberRole, React.ReactNode> = {
  [MemberRole.OWNER]: <LuShield size={14} aria-hidden="true" />,
  [MemberRole.ADMIN]: <LuUsers size={14} aria-hidden="true" />,
  [MemberRole.MEMBER]: <LuUser size={14} aria-hidden="true" />,
  [MemberRole.GUEST]: <LuClock size={14} aria-hidden="true" />,
};

const roleDescriptionMap: Record<MemberRole, string> = {
  [MemberRole.OWNER]: "完全控制空间的所有权限",
  [MemberRole.ADMIN]: "可以管理空间设置和成员",
  [MemberRole.MEMBER]: "可以查看和编辑空间内容",
  [MemberRole.GUEST]: "仅可查看空间内容",
};

const SpaceMembers: React.FC = () => {
  const { spaceId } = useParams<"spaceId">();
  const dispatch = useAppDispatch();

  const { spaceData, loading, error } = useSpaceData(spaceId!);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (spaceData) {
      setMembers(spaceData.members || []);
    }
  }, [spaceData]);

  const handleInviteMember = async (identifier: string, role: string) => {
    if (!spaceData) return;
    try {
      const mappedRole =
        role === "viewer" ? MemberRole.GUEST : MemberRole.MEMBER;

      await dispatch(
        addMember({
          spaceId: spaceId!,
          memberId: identifier,
          role: mappedRole,
        })
      ).unwrap();

      toast.success("邀请已发送");
      setShowInviteModal(false);
    } catch (err) {
      toast.error("邀请失败");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!spaceData) return;
    try {
      setRemovingMemberId(memberId);
      await dispatch(
        removeMember({
          spaceId: spaceId!,
          memberId,
        })
      ).unwrap();
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("已移除成员");
    } catch (err) {
      const message = toErrorMessage(err);
      toast.error(`移除失败: ${message}`);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: MemberRole) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );

      setEditMemberId(null);
      toast.success("成员角色已更新");
    } catch (err) {
      toast.error("更新失败");
    }
  };

  if (loading) {
    return (
      <div className="space-members">
        <div className="space-members__loading">
          <span className="space-members__loading-spinner" />
          <span>正在加载成员信息...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-members">
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        loading={false}
      />

      <header className="space-members__header">
        <div className="space-members__header-left">
          <LuUsers aria-hidden="true" className="space-members__header-icon" />
          <div className="space-members__header-copy">
            <div className="space-members__title-row">
              <h2 className="space-members__title">空间成员</h2>
              {spaceData && !error && (
                <span className="space-members__count">{members.length}</span>
              )}
            </div>
            <p className="space-members__subtitle">
              管理谁可以访问此空间，以及他们的角色权限
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="space-members__invite-btn"
          onClick={() => setShowInviteModal(true)}
          icon={<LuPlus size={15} aria-hidden="true" />}
        >
          邀请成员
        </Button>
      </header>

      {error || !spaceData ? (
        <div className="space-members__error">
          <h3 className="space-members__error-title">无法加载成员信息</h3>
          <p className="space-members__error-text">
            {error ? error.message : "未找到空间数据"}
          </p>
        </div>
      ) : (
        <>
          <section className="space-members__section">
            {members.length > 0 ? (
              <ul className="space-members__members-list">
                {members.map((member) => {
                  const isOwner = member.id === spaceData.ownerId;
                  const isEditing = editMemberId === member.id;

                  return (
                    <li
                      key={member.id}
                      className={
                        isOwner
                          ? "space-members__member-item space-members__member-item--owner"
                          : "space-members__member-item"
                      }
                    >
                      <div className="space-members__member-info">
                        <div className="space-members__avatar">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} />
                          ) : (
                            <div
                              className="space-members__avatar-fallback"
                              style={{
                                backgroundColor: stringToColor(
                                  member.name || member.id
                                ),
                              }}
                            >
                              {getInitials(member.name || member.id)}
                            </div>
                          )}
                        </div>
                        <div className="space-members__member-meta">
                          <div className="space-members__member-name-row">
                            <span className="space-members__member-name">
                              {member.name}
                            </span>
                            {isOwner && (
                              <span className="space-members__owner-badge">
                                创建者
                              </span>
                            )}
                          </div>
                          <span className="space-members__member-email">
                            {member.email || member.id}
                          </span>
                        </div>
                      </div>

                      <div className="space-members__member-controls">
                        <div className="space-members__member-role">
                          {isEditing ? (
                            <div className="space-members__role-editor">
                              <Select
                                className="space-members__role-select"
                                selectedKey={member.role}
                                onSelectionChange={(key) =>
                                  updateMemberRole(
                                    member.id,
                                    (key == null
                                      ? member.role
                                      : String(key)) as MemberRole
                                  )
                                }
                              >
                                <SelectItem
                                  id={MemberRole.ADMIN}
                                  textValue="管理员"
                                >
                                  管理员
                                </SelectItem>
                                <SelectItem
                                  id={MemberRole.MEMBER}
                                  textValue="成员"
                                >
                                  成员
                                </SelectItem>
                                <SelectItem
                                  id={MemberRole.GUEST}
                                  textValue="访客"
                                >
                                  访客
                                </SelectItem>
                              </Select>
                              <button
                                type="button"
                                className="space-members__role-cancel"
                                onClick={() => setEditMemberId(null)}
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="space-members__role-chip">
                              <span className="space-members__member-role-icon">
                                {roleIconMap[member.role]}
                              </span>
                              <span>{roleLabelMap[member.role]}</span>
                            </div>
                          )}
                        </div>

                        {isOwner ? (
                          <div
                            className="space-members__actions space-members__actions--spacer"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="space-members__actions">
                            {!isEditing && (
                              <button
                                type="button"
                                className="space-members__action"
                                title="更改角色"
                                aria-label={`更改 ${member.name} 的角色`}
                                onClick={() => setEditMemberId(member.id)}
                              >
                                <LuPencil size={13} aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="space-members__action space-members__action--remove"
                              title="移除成员"
                              aria-label={`移除成员 ${member.name}`}
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removingMemberId === member.id}
                            >
                              {removingMemberId === member.id ? (
                                <span
                                  className="space-members__inline-spinner"
                                  aria-hidden="true"
                                />
                              ) : (
                                <LuTrash2 size={13} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<LuUserPlus size={26} aria-hidden="true" />}
                title="邀请团队成员"
                description="邀请成员加入这个空间，一起协作和分享内容"
                actionText={
                  <>
                    <LuPlus size={15} aria-hidden="true" />
                    邀请成员
                  </>
                }
                onAction={() => setShowInviteModal(true)}
              />
            )}
          </section>

          <section className="space-members__roles-section">
            <div className="space-members__roles-header">
              <h3 className="space-members__roles-title">角色说明</h3>
              <p className="space-members__roles-desc">
                不同角色决定成员可执行的操作范围
              </p>
            </div>
            <div className="space-members__roles-list">
              {Object.entries(roleLabelMap).map(([role, label]) => (
                <div key={role} className="space-members__role-item">
                  <span className="space-members__role-item-icon">
                    {roleIconMap[role as MemberRole]}
                  </span>
                  <div className="space-members__role-item-copy">
                    <span className="space-members__role-item-name">
                      {label}
                    </span>
                    <span className="space-members__role-item-desc">
                      {roleDescriptionMap[role as MemberRole]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export default SpaceMembers;
