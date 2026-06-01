/**
 * en
 *
 * @description Standardized execution for en.
 */
export const en = {
  Navigation: {
    societyName: 'Society of Arts and Letters',
    home: 'Home',
    events: 'Events',
    journal: 'The Journal',
  },
  Footer: {
    societyName: 'AUIB Society of Arts and Letters',
    description: 'Fostering academic excellence, creative discourse, and the humanities across the university campus.',
    linksTitle: 'Navigation',
    home: 'Home',
    events: 'Events',
    journal: 'Journal',
    contactTitle: 'Society Address',
    university: 'American University of Iraq, Baghdad',
    addressLine1: 'Airport Road',
    addressLine2: 'Baghdad, Iraq',
    rights: 'All Rights Reserved.',
    designedBy: 'Designed for the literary mind.',
  },
  HomePage: {
    title: 'Society of Arts and Letters',
    subtitle: 'Fostering literary excellence, discourse, and the humanities at the American University of Iraq, Baghdad.',
    missionTitle: 'Our Mission',
    missionText: 'To cultivate a community of scholars and artists dedicated to the pursuit of intellectual and creative expression.',
    membershipTitle: 'Membership',
    membershipText: 'Membership is extended to students who demonstrate exceptional promise in the literary, performing, and visual arts.',
    applyButton: 'Inquire Regarding Membership',
  },
  EventsPage: {
    pageTitle: 'Gatherings & Productions',
    pageSubtitle: 'Join us for an upcoming evening of literary discourse, theatrical stagings, or society readings.',
    event1Date: 'October 15, 2026',
    event1Title: 'Autumn Literary Reading',
    event1Location: 'AUIB Library Rotunda',
    event1Desc: 'An evening of original poetry and prose read by the founding members of the society.',
    event2Date: 'November 20, 2026',
    event2Title: 'Staged Production: The Importance of Being Earnest',
    event2Location: 'AUIB Main Auditorium',
    event2Desc: "A collaborative production bringing Oscar Wilde's classic, A Trivial Comedy for Serious People, to the university stage.",
  },
  JournalPage: {
    journalName: 'The SAL Review',
    journalSubtitle: 'The Official Literary Publication of the Society',
    journalIntro: 'Publishing the finest essays, poetry, and dramatic criticisms authored by our members and the wider university body.',
    article1Title: 'The Genesis of Letters at AUIB',
    article1Authors: 'Authored by Shaheen Farjo. Contributions by Hussein, Remas, and Jude.',
    article1Excerpt: 'An exploration into the founding necessity of a literary society within a burgeoning university environment, examining the role of humanities in a modern technical world.',
    readMore: 'Read Full Essay',
    noIssues: 'No published issues yet.',
  },
  AboutPage: {
    title: 'About the Society',
    p1: 'The AUIB Society of Arts and Letters is a community dedicated to the humanities.',
    p2: 'We believe in the power of words, art, and intellectual exchange.',
  },
  PoliciesPage: {
    title: 'Policies',
    p1: 'All members must adhere to the highest standards of academic integrity.',
    p2: 'Plagiarism is strictly prohibited.',
  },
  CharterPage: {
    title: 'Charter and Bylaws',
    p1: 'This document outlines the foundational principles of our society.',
    p2: 'The society operates independently under the guidance of our faculty.',
  },
  BlogPage: {
    title: 'Society News',
    subtitle: 'Latest updates and announcements.',
    placeholderTitle: 'Coming Soon',
    placeholderDesc: 'Our first blog post will be published here.',
    noPosts: 'No blog posts published yet.',
    readArticle: 'Read Article',
    backToBlog: 'Back to Blog',
  },
  PortalPage: {
    title: 'Member Portal',
    welcome: 'Welcome back.',
    submissionsText: 'Track the status of your recent submissions here.',
    eventsText: 'RSVP to upcoming exclusive member events.',
  },
  SubmitPage: {
    title: 'Submit Your Work',
    instructions: 'Use this form to submit your writing to the editorial board.',
    formTitle: 'Title',
    formType: 'Type of Work',
    typeEssay: 'Essay',
    typePoetry: 'Poetry',
    typeFiction: 'Fiction',
    formContent: 'Content',
    submitButton: 'Submit Manuscript',
  },
  NotFound: {
    title: '404',
    heading: 'Page Not Found',
    description: 'The manuscript you are looking for has been lost in the archives.',
    returnHome: 'Return Home',
    quotes: {
      q1: 'Not all those who wander are lost, but this page certainly is.',
      q2: 'A blank page is a canvas, but this one is just missing.',
      q3: 'The ink has dried, and the words have faded from this path.',
      q4: 'Some stories remain untold, and some links remain broken.',
    },
  },
  LoginPage: {
    loginTitle: 'Member Login',
    loginSubtitle: 'Access the society portal.',
    registerTitle: 'Request Membership',
    registerSubtitle: 'Submit your credentials for review.',
    emailLabel: 'University Email',
    passwordLabel: 'Password',
    loginButton: 'Enter',
    registerButton: 'Submit Request',
    loading: 'Processing...',
    registerSuccess: 'Request submitted. Please await further instructions.',
  },
  NexusIntro: {
    title: 'Welcome to Nexus',
    description: 'Nexus is the central hub for our members and editorial staff.',
    feature1: '• Submit your creative writing and artistic portfolios for review.',
    feature2: '• Track the status of your submissions.',
    feature3: '• Access the editorial overview and member management (approved staff only).',
    loginLink: 'Access Nexus',
  },
} as const;

// Forces all other locales to strictly match this object shape
/**
 * Dictionary
 *
 * @description Standardized execution for Dictionary.
 */
export type Dictionary = typeof en;
