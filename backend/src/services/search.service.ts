import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import MemberModel from "../models/member.model";
import CommentModel from "../models/comment.model";

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const searchWorkspaceService = async (
  workspaceId: string,
  query: string
) => {
  if (!query || query.trim().length === 0) {
    return {
      projects: [],
      tasks: [],
      members: [],
      comments: [],
    };
  }

  const safeQuery = escapeRegex(query.trim());
  const regex = new RegExp(safeQuery, "i");

  const [projects, tasks, members, comments] = await Promise.all([
    // 1. Projects
    ProjectModel.find({
      workspace: workspaceId,
      $or: [{ name: regex }, { description: regex }],
    }).limit(10),

    // 2. Tasks
    TaskModel.find({
      workspace: workspaceId,
      $or: [{ title: regex }, { description: regex }, { taskCode: regex }, { tags: regex }],
    })
      .populate("project", "name emoji")
      .populate("assignedTo", "name email")
      .limit(20),

    // 3. Members
    MemberModel.find({
      workspaceId,
    })
      .populate({
        path: "userId",
        match: { $or: [{ name: regex }, { email: regex }] },
        select: "name email profilePicture",
      })
      .populate("role", "name")
      .then((records) => records.filter((r) => r.userId !== null).slice(0, 10)),

    // 4. Comments
    CommentModel.find({
      workspaceId,
      content: regex,
    })
      .populate("userId", "name email profilePicture")
      .populate("taskId", "title taskCode")
      .limit(10),
  ]);

  return {
    projects,
    tasks,
    members,
    comments,
  };
};

