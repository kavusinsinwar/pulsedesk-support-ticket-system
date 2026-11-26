export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Support Ticket Management System API',
    version: '1.0.0',
    description:
      'Mini Helpdesk REST API with JWT Authentication, Role-Based Access Control (USER/ADMIN), Ticket Lifecycle Management, Comments, Event-Driven Activity Logs & Notifications, and Analytics Dashboard.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account (always assigned USER role)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Rivera' },
                  email: { type: 'string', example: 'alex@example.com' },
                  password: { type: 'string', example: 'StrongPass1' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered and JWT issued' },
          '409': { description: 'Email already exists' },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and issue JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@helpdesk.dev' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        responses: { '200': { description: 'Current user profile' } },
      },
    },
    '/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'List tickets (scoped to owner for USER, all tickets for ADMIN)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['TECHNICAL', 'BILLING', 'ACCOUNT', 'FEATURE_REQUEST', 'GENERAL'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'priority', 'status'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { '200': { description: 'Paginated ticket list' } },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a new support ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string', example: 'Payment webhook returns 500' },
                  description: { type: 'string', example: 'Stripe webhook fails with signature mismatch on production.' },
                  category: { type: 'string', enum: ['TECHNICAL', 'BILLING', 'ACCOUNT', 'FEATURE_REQUEST', 'GENERAL'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Ticket created' } },
      },
    },
    '/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket details with comments and activity timeline',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Ticket details' }, '403': { description: 'Forbidden' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Edit ticket details (requester allowed only while OPEN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Ticket updated' } },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Delete ticket (requester allowed only while OPEN; ADMIN anytime)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Ticket deleted' } },
      },
    },
    '/tickets/{id}/admin': {
      patch: {
        tags: ['Admin'],
        summary: 'Admin update ticket status, priority, or assignee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                  assignedToId: { type: 'string', format: 'uuid', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Ticket updated by admin' }, '403': { description: 'Admin only' } },
      },
    },
    '/tickets/{id}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments for a ticket',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of comments' } },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add a comment to a ticket (owner or ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', example: 'We are investigating this now.' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Comment added' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notifications and unread count for authenticated user',
        responses: { '200': { description: 'Notifications list' } },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        responses: { '200': { description: 'All marked as read' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a single notification as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Marked as read' } },
      },
    },
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get ticket analytics and recent tickets (global for ADMIN, personal for USER)',
        responses: { '200': { description: 'Dashboard statistics' } },
      },
    },
  },
};
