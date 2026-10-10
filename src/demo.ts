import type { Campus, College, Network } from './types';

const stamp = '2026-10-10T09:00:00Z';
export const demoCollege: College = { id: 'demo-campus', name: 'Government Polytechnic, Patna', city: 'Patna, Bihar', kind: 'Polytechnic', about: 'An illustrative campus for exploring Yuvann. This is not an official college page.', verified: false, createdAt: stamp };

export const demoCampus: Campus = {
  college: demoCollege,
  groups: [
    { id: 'g1', name: 'Mechanical · Semester 3', description: 'A place for class discussions, course material, and helping each other figure things out.', kind: 'class', policy: 'semester_restricted', department: 'Mechanical Engineering', branch: 'Mechanical', semester: '3', section: 'A', collegeId: 'demo-campus', ownerId: 'demo-teacher', createdAt: stamp },
    { id: 'g2', name: 'The Robotics Collective', description: 'Small ideas. Moving parts. Big possibilities. Build something with your campus makers.', kind: 'club', policy: 'college_verified', department: '', branch: '', semester: '', section: '', collegeId: 'demo-campus', ownerId: 'demo-teacher', createdAt: stamp },
    { id: 'g3', name: 'Thermodynamics', description: 'Class notes, weekly questions, and guidance from your course teacher.', kind: 'teacher', policy: 'teacher_approval', department: '', branch: 'Mechanical', semester: '3', section: '', collegeId: 'demo-campus', ownerId: 'demo-teacher', createdAt: stamp },
    { id: 'g4', name: 'Campus Creatives', description: 'Photography, design, music, and all the things that make campus life yours.', kind: 'club', policy: 'college_verified', department: '', branch: '', semester: '', section: '', collegeId: 'demo-campus', ownerId: 'demo-teacher', createdAt: stamp },
  ],
  posts: [
    { id: 'p1', collegeId: 'demo-campus', authorId: 'demo-teacher', authorName: 'Mechanical Department', category: 'official', title: 'A little heads-up for Semester 3', body: 'Your Engineering Mechanics assignment is now in the classroom group. Take a look at the problem set and bring your questions to our next discussion. Let’s work through it together.', pinned: true, priority: 'important', expiresAt: null, createdAt: stamp, likes: 28, liked: false, readCount: 39, read: false, comments: [] },
    { id: 'p2', collegeId: 'demo-campus', authorId: 'demo-student', authorName: 'Ananya Sharma', category: 'discussion', title: 'Anyone up for building something this weekend?', body: 'We’re putting together a small team for the inter-college design challenge. Looking for people who enjoy CAD, problem-solving, or just making things work. You don’t need to be an expert — curiosity counts!', pinned: false, priority: 'normal', expiresAt: null, createdAt: stamp, likes: 17, liked: false, readCount: 0, read: false, comments: [{ id: 'c1', postId: 'p2', authorName: 'Rohan Verma', body: 'Count me in! I can help with the CAD model.', createdAt: stamp }] },
    { id: 'p3', collegeId: 'demo-campus', authorId: 'demo-club', authorName: 'The Robotics Collective', category: 'achievements', title: 'From a sketch to our first working prototype.', body: 'Three weeks, a lot of late afternoons, and one very determined team. Our line-following robot is finally ready for the showcase. Come say hello at the workshop!', pinned: false, priority: 'normal', expiresAt: null, createdAt: stamp, likes: 46, liked: false, readCount: 0, read: false, comments: [] },
    { id: 'p4', collegeId: 'demo-campus', authorId: 'demo-teacher', authorName: 'Placement & Training Cell', category: 'opportunities', title: 'Your next summer could start here.', body: 'Explore the student innovation internship orientation. Learn about building a portfolio, choosing a project, and making your first application.', pinned: false, priority: 'normal', expiresAt: null, createdAt: stamp, likes: 23, liked: false, readCount: 0, read: false, comments: [] },
  ],
  notes: [
    { id: 'n1', title: 'Statics & equilibrium', subject: 'Engineering Mechanics', branch: 'Mechanical', semester: '3', unit: '2', chapter: 'Static Equilibrium', description: 'Free-body diagrams, Lami’s theorem, and worked numerical examples.', tags: ['Mechanics', 'Unit 2'], fileId: 'demo-file', authorName: 'Prof. A. Sinha', createdAt: stamp },
    { id: 'n2', title: 'The laws of thermodynamics', subject: 'Thermodynamics', branch: 'Mechanical', semester: '3', unit: '1', chapter: 'Basic Concepts', description: 'A clear introduction to energy, systems, and the first law.', tags: ['Thermodynamics', 'Class notes'], fileId: 'demo-file', authorName: 'Kavya Mishra', createdAt: stamp },
    { id: 'n3', title: 'Engineering drawing essentials', subject: 'Engineering Drawing', branch: 'Mechanical', semester: '3', unit: '3', chapter: 'Projections', description: 'Orthographic projections and practice sheets for your next session.', tags: ['Drawing', 'Reference'], fileId: 'demo-file', authorName: 'Rohan Verma', createdAt: stamp },
  ],
  events: [
    { id: 'e1', collegeId: 'demo-campus', organizerId: 'demo-teacher', title: 'Build. Break. Repeat.', description: 'A hands-on robotics workshop for curious minds. Meet your campus makers and take a small idea from sketch to prototype.', category: 'Workshop', startsAt: '2026-10-18T10:00:00+05:30', deadline: '2026-10-17T18:00:00+05:30', venue: 'Innovation Lab, Block B', visibility: 'campus', capacity: 48, createdAt: stamp },
    { id: 'e2', collegeId: 'demo-campus', organizerId: 'demo-teacher', title: 'Campus to campus', description: 'An inter-college design sprint. Find your team, tackle a real-world challenge, and share what you build.', category: 'Hackathon', startsAt: '2026-10-24T09:00:00+05:30', deadline: '2026-10-22T18:00:00+05:30', venue: 'Patna · Inter-college', visibility: 'public', capacity: 126, createdAt: stamp },
    { id: 'e3', collegeId: 'demo-campus', organizerId: 'demo-teacher', title: 'Beyond the classroom', description: 'An open conversation with alumni about projects, portfolios, and finding your own direction.', category: 'Community', startsAt: '2026-10-28T15:00:00+05:30', deadline: '2026-10-27T18:00:00+05:30', venue: 'Seminar Hall', visibility: 'campus', capacity: 85, createdAt: stamp },
  ],
  assignments: [
    { id: 'a1', collegeId: 'demo-campus', teacherId: 'demo-teacher', groupId: 'g1', title: 'Static equilibrium · Problem set', description: 'Solve the practice problems and include your free-body diagrams.', subject: 'Engineering Mechanics', dueAt: '2026-10-18T23:59:00+05:30', maxMarks: 20, createdAt: stamp },
    { id: 'a2', collegeId: 'demo-campus', teacherId: 'demo-teacher', groupId: 'g3', title: 'The first law, in practice', description: 'Explain the first law using two everyday examples.', subject: 'Thermodynamics', dueAt: '2026-10-22T23:59:00+05:30', maxMarks: 15, createdAt: stamp },
  ],
  joins: [], groupRequests: [], submissions: [], attendance: [], people: [], memberRequests: [], messages: [], units: [], registrations: [], logs: [],
};

export const demoNetwork: Network = {
  colleges: [demoCollege, { ...demoCollege, id: 'demo-2', name: 'Patna Institute of Technology', kind: 'Engineering', about: 'An illustrative engineering campus.', city: 'Patna, Bihar' }, { ...demoCollege, id: 'demo-3', name: 'Nalanda School of Design', kind: 'Design', about: 'An illustrative design community.', city: 'Rajgir, Bihar' }, { ...demoCollege, id: 'demo-4', name: 'Bihar College of Sciences', kind: 'Science', about: 'An illustrative science campus.', city: 'Muzaffarpur, Bihar' }],
  events: demoCampus.events.filter((event) => event.visibility === 'public'),
};
