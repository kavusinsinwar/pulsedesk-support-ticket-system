import { PrismaClient, Role, TicketCategory, TicketPriority, TicketStatus, EventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
  const userPasswordHash = await bcrypt.hash('User@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.dev' },
    update: {},
    create: {
      name: 'Alex Morgan (Admin)',
      email: 'admin@helpdesk.dev',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'rahul@example.com' },
    update: {},
    create: {
      name: 'Rahul Verma',
      email: 'rahul@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const existingTickets = await prisma.ticket.count();
  if (existingTickets === 0) {
    const t1 = await prisma.ticket.create({
      data: {
        title: 'Unable to export monthly billing invoice as PDF',
        description:
          'When clicking the Export PDF button on the Billing -> Invoices tab, the spinner hangs indefinitely and returns a 504 timeout error.',
        category: TicketCategory.BILLING,
        priority: TicketPriority.HIGH,
        status: TicketStatus.IN_PROGRESS,
        createdById: user1.id,
        assignedToId: admin.id,
        comments: {
          create: [
            {
              content: 'I have attached my browser console logs — looks like the PDF worker endpoint is timing out.',
              authorId: user1.id,
            },
            {
              content: 'Thanks Sarah! We identified a slow query in the invoice generator and are deploying a fix shortly.',
              authorId: admin.id,
            },
          ],
        },
        activityLogs: {
          create: [
            {
              eventType: EventType.TICKET_CREATED,
              description: 'Ticket created by Sarah Chen',
              actorId: user1.id,
              metadata: { priority: 'HIGH', category: 'BILLING' },
            },
            {
              eventType: EventType.TICKET_STATUS_CHANGED,
              description: 'Status changed from OPEN to IN_PROGRESS by Alex Morgan (Admin)',
              actorId: admin.id,
              metadata: { from: 'OPEN', to: 'IN_PROGRESS' },
            },
          ],
        },
      },
    });

    const t2 = await prisma.ticket.create({
      data: {
        title: 'Two-factor authentication SMS codes delayed by 10+ minutes',
        description:
          'Login OTP SMS takes over 10 minutes to arrive, causing the verification session to expire before I can enter the code.',
        category: TicketCategory.ACCOUNT,
        priority: TicketPriority.URGENT,
        status: TicketStatus.OPEN,
        createdById: user2.id,
        activityLogs: {
          create: {
            eventType: EventType.TICKET_CREATED,
            description: 'Ticket created by Rahul Verma',
            actorId: user2.id,
            metadata: { priority: 'URGENT', category: 'ACCOUNT' },
          },
        },
      },
    });

    const t3 = await prisma.ticket.create({
      data: {
        title: 'Add dark mode support to analytics export view',
        description:
          'Would love to have dark theme compatibility when viewing embedded reports on OLED displays.',
        category: TicketCategory.FEATURE_REQUEST,
        priority: TicketPriority.LOW,
        status: TicketStatus.RESOLVED,
        createdById: user1.id,
        assignedToId: admin.id,
        resolvedAt: new Date(),
        activityLogs: {
          create: [
            {
              eventType: EventType.TICKET_CREATED,
              description: 'Ticket created by Sarah Chen',
              actorId: user1.id,
            },
            {
              eventType: EventType.TICKET_RESOLVED,
              description: 'Ticket marked as RESOLVED by Alex Morgan (Admin)',
              actorId: admin.id,
              metadata: { from: 'IN_PROGRESS', to: 'RESOLVED' },
            },
          ],
        },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: user1.id,
          ticketId: t1.id,
          eventType: EventType.TICKET_STATUS_CHANGED,
          title: 'Ticket Status Updated',
          message: `Your ticket "${t1.title}" is now IN_PROGRESS.`,
        },
        {
          userId: user1.id,
          ticketId: t3.id,
          eventType: EventType.TICKET_RESOLVED,
          title: 'Ticket Resolved',
          message: `Your ticket "${t3.title}" has been marked as RESOLVED.`,
        },
        {
          userId: admin.id,
          ticketId: t2.id,
          eventType: EventType.TICKET_CREATED,
          title: 'New Urgent Ticket',
          message: `Rahul Verma submitted an URGENT ticket: "${t2.title}".`,
        },
      ],
    });
  }

  console.log('Seed completed successfully.');
  console.log('Demo Admin: admin@helpdesk.dev / Admin@123');
  console.log('Demo User 1: sarah@example.com / User@123');
  console.log('Demo User 2: rahul@example.com / User@123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
