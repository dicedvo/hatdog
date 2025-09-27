import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let emailContent;
    let recipient;

    switch (type) {
      case 'task-assigned':
        const { assigneeName, assigneeEmail, taskTitle, assignerName, taskUrl } = data;
        if (!assigneeEmail) {
          return NextResponse.json(
            { error: 'Assignee email not provided' },
            { status: 400 }
          );
        }
        recipient = assigneeEmail;
        emailContent = emailTemplates.taskAssigned(
          assigneeName || 'Team Member',
          taskTitle,
          assignerName || 'A team member',
          taskUrl
        );
        break;

      case 'task-updated':
        const { 
          assigneeName: updateAssigneeName, 
          assigneeEmail: updateAssigneeEmail, 
          taskTitle: updateTaskTitle, 
          updaterName, 
          changes,
          taskUrl: updateTaskUrl 
        } = data;
        if (!updateAssigneeEmail) {
          return NextResponse.json(
            { error: 'Assignee email not provided' },
            { status: 400 }
          );
        }
        recipient = updateAssigneeEmail;
        emailContent = emailTemplates.taskUpdated(
          updateAssigneeName || 'Team Member',
          updateTaskTitle,
          updaterName || 'A team member',
          changes,
          updateTaskUrl
        );
        break;

      case 'task-due-soon':
        const {
          assigneeName: dueAssigneeName,
          assigneeEmail: dueAssigneeEmail,
          taskTitle: dueTaskTitle,
          dueDate,
          taskUrl: dueTaskUrl
        } = data;
        if (!dueAssigneeEmail) {
          return NextResponse.json(
            { error: 'Assignee email not provided' },
            { status: 400 }
          );
        }
        recipient = dueAssigneeEmail;
        emailContent = emailTemplates.taskDueSoon(
          dueAssigneeName || 'Team Member',
          dueTaskTitle,
          dueDate,
          dueTaskUrl
        );
        break;

      case 'task-completed':
        const {
          creatorName,
          creatorEmail,
          taskTitle: completedTaskTitle,
          completedByName,
          taskUrl: completedTaskUrl
        } = data;
        if (!creatorEmail) {
          return NextResponse.json(
            { error: 'Creator email not provided' },
            { status: 400 }
          );
        }
        recipient = creatorEmail;
        emailContent = emailTemplates.taskCompleted(
          creatorName || 'Team Member',
          completedTaskTitle,
          completedByName || 'A team member',
          completedTaskUrl
        );
        break;

      case 'task-comment':
        const {
          recipientName,
          recipientEmail,
          taskTitle: commentTaskTitle,
          commenterName,
          comment,
          taskUrl: commentTaskUrl
        } = data;
        if (!recipientEmail) {
          return NextResponse.json(
            { error: 'Recipient email not provided' },
            { status: 400 }
          );
        }
        recipient = recipientEmail;
        emailContent = emailTemplates.taskComment(
          recipientName || 'Team Member',
          commentTaskTitle,
          commenterName || 'A team member',
          comment,
          commentTaskUrl
        );
        break;

      case 'task-checklist':
        const {
          recipientName: checklistRecipientName,
          recipientEmail: checklistRecipientEmail,
          taskTitle: checklistTaskTitle,
          adderName,
          checklistItem,
          taskUrl: checklistTaskUrl
        } = data;
        if (!checklistRecipientEmail) {
          return NextResponse.json(
            { error: 'Recipient email not provided' },
            { status: 400 }
          );
        }
        recipient = checklistRecipientEmail;
        emailContent = emailTemplates.taskChecklist(
          checklistRecipientName || 'Team Member',
          checklistTaskTitle,
          adderName || 'A team member',
          checklistItem,
          checklistTaskUrl
        );
        break;

      case 'checklist-completed':
        const {
          recipientName: checklistCompletedRecipientName,
          recipientEmail: checklistCompletedRecipientEmail,
          taskTitle: checklistCompletedTaskTitle,
          completerName,
          checklistItem: completedChecklistItem,
          taskUrl: checklistCompletedTaskUrl
        } = data;
        if (!checklistCompletedRecipientEmail) {
          return NextResponse.json(
            { error: 'Recipient email not provided' },
            { status: 400 }
          );
        }
        recipient = checklistCompletedRecipientEmail;
        emailContent = emailTemplates.checklistCompleted(
          checklistCompletedRecipientName || 'Team Member',
          checklistCompletedTaskTitle,
          completerName || 'A team member',
          completedChecklistItem,
          checklistCompletedTaskUrl
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to: recipient,
      ...emailContent
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}