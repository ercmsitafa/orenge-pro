const DEFAULT_WORKSPACE_CONTENT = {
  brand: {
    name: 'Orange',
  },
  navigation: {
    workspace: 'Workspace',
    dashboard: 'Dashboard',
    overview: 'Overview',
    profile: 'Profile',
    about: 'About',
    settings: 'Settings',
    content: 'Content',
    logout: 'Log out',
    logoutMessage: 'You have been signed out.',
    navigationLabel: 'Main navigation',
  },
  dashboard: {
    eyebrow: 'Your workspace',
    greeting: 'Good to see you, {name}.',
    subtitle: 'Here’s a clear view of your account, all in one place.',
    profileCard: 'Your profile',
    profileAction: 'View profile',
    memberCard: 'Member since',
    accountActive: 'Account active',
    overviewAction: 'Account overview',
    notificationsCard: 'Email notifications',
    notificationsEnabled: 'All set',
    notificationsDisabled: 'Paused',
    notificationsEnabledDescription: 'You’ll receive account updates.',
    notificationsDisabledDescription: 'Account emails are switched off.',
    notificationsOn: 'On',
    notificationsOff: 'Off',
    summaryLabel: 'Account summary',
  },
  overview: {
    eyebrow: 'Your workspace',
    title: 'Account overview',
    subtitle: 'The essentials, without the digging.',
    statusLabel: 'Account status',
    statusValue: 'Active',
    nameLabel: 'Name',
    emailLabel: 'Email address',
    memberSinceLabel: 'Member since',
    notificationsLabel: 'Email notifications',
    notificationsEnabled: 'Enabled',
    notificationsDisabled: 'Paused',
    accountDetailsLabel: 'Account details',
  },
  profile: {
    eyebrow: 'Your workspace',
    title: 'Your profile',
    subtitle: 'Keep the name on your account up to date.',
    panelTitle: 'Personal details',
    nameLabel: 'Display name',
    emailLabel: 'Email address',
    saveButton: 'Save changes',
    savedMessage: 'Your profile has been updated.',
  },
  about: {
    eyebrow: 'Your workspace',
    title: 'About Orange',
    subtitle: 'A calmer place to look after the details.',
    paragraph: 'Orange is a simple personal workspace for your account details and preferences. Your profile is yours to update, your settings are saved to your account, and signing in brings you back to the same place.',
    securityNote: 'Your account information is stored securely. Passwords are hashed before storage, and your sign-in session is held in an HTTP-only cookie.',
  },
  settings: {
    eyebrow: 'Your workspace',
    title: 'Settings',
    subtitle: 'Choose how you’d like to hear from us.',
    notificationsTitle: 'Email notifications',
    notificationsDescription: 'Receive useful updates about your account by email.',
    emailTitle: 'Your email address',
    emailDescription: 'Account email',
    notificationsEnabledMessage: 'Email notifications enabled.',
    notificationsDisabledMessage: 'Email notifications paused.',
  },
  cms: {
    eyebrow: 'Workspace editor',
    title: 'Content management',
    subtitle: 'Edit the words shown across your workspace. Changes are saved to your account.',
    saveButton: 'Save all changes',
    savingButton: 'Saving changes…',
    savedMessage: 'Workspace content saved.',
    sectionBrand: 'Brand',
    sectionNavigation: 'Navigation',
    sectionDashboard: 'Dashboard',
    sectionOverview: 'Overview',
    sectionProfile: 'Profile',
    sectionAbout: 'About',
    sectionSettings: 'Settings',
    sectionCms: 'Content editor',
    profileError: 'Your profile could not be updated.',
    saveError: 'Workspace content could not be saved.',
  },
};

function validateWorkspaceContent(content) {
  function validateValue(value, expected) {
    if (typeof expected === 'string') {
      return typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const expectedKeys = Object.keys(expected);
    const valueKeys = Object.keys(value);
    if (expectedKeys.length !== valueKeys.length || expectedKeys.some((key) => !Object.hasOwn(value, key))) {
      return false;
    }
    return expectedKeys.every((key) => validateValue(value[key], expected[key]));
  }

  return validateValue(content, DEFAULT_WORKSPACE_CONTENT);
}

function createDefaultWorkspaceContent() {
  return JSON.parse(JSON.stringify(DEFAULT_WORKSPACE_CONTENT));
}

module.exports = { createDefaultWorkspaceContent, validateWorkspaceContent };
