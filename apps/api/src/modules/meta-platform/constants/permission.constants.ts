export const PermissionConstants = {
    INSTAGRAM_BASIC: 'instagram_basic',
    INSTAGRAM_MANAGE_MESSAGES: 'instagram_manage_messages',
    INSTAGRAM_MANAGE_COMMENTS: 'instagram_manage_comments',
    PAGES_SHOW_LIST: 'pages_show_list',
    PAGES_READ_ENGAGEMENT: 'pages_read_engagement',
    BUSINESS_MANAGEMENT: 'business_management',
} as const;

export const REQUIRED_PERMISSIONS = [
    PermissionConstants.INSTAGRAM_BASIC,
    PermissionConstants.INSTAGRAM_MANAGE_MESSAGES,
    PermissionConstants.INSTAGRAM_MANAGE_COMMENTS,
    PermissionConstants.PAGES_SHOW_LIST,
    PermissionConstants.PAGES_READ_ENGAGEMENT,
    PermissionConstants.BUSINESS_MANAGEMENT,
] as const;
