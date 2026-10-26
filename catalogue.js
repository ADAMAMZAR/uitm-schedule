const A_GROUP_TIMES = {
  CSC435: { session: '1', start: '10:30', end: '12:30', room: 'BK14', tbc: false },
  STA416: { session: '1', start: '14:30', end: '16:30', room: 'BK28', tbc: false },
  LCC401: { session: '2', start: '08:30', end: '10:30', room: 'TH01', tbc: false },
  LCC500: { session: '1', start: '08:30', end: '10:30', room: 'BK33', tbc: false },
  CSC508: { session: '2', start: '14:30', end: '16:30', room: 'MK15', tbc: false },
  CSC569: { session: '2', start: '08:30', end: '10:30', room: 'BK34', tbc: false },
  CSC577: { session: '2', start: '10:30', end: '12:30', room: 'BK32', tbc: false },
  CSC580: { session: '2', start: '10:30', end: '12:30', room: 'BK32', tbc: false },
  CSC584: { session: '1', start: '16:30', end: '18:30', room: 'BK02', tbc: false },
  CSC574: { session: '1', start: '08:30', end: '10:30', room: 'BK10', tbc: false },
  CSC662: { session: '1', start: '10:30', end: '12:30', room: 'BK02', tbc: false },
  ICT502: { session: '1', start: '10:30', end: '12:30', room: 'MK14', tbc: false },
  ICT652: { session: '2', start: '08:30', end: '10:30', room: 'BK03', tbc: false },
  CSC649: { session: '2', start: '14:30', end: '16:30', room: 'BK03', tbc: false },
  CSP600: { session: '2', start: '10:30', end: '12:30', room: 'BK03', tbc: false },
  CSP650: { session: '1', start: '10:30', end: '12:30', room: 'BK10', tbc: false },
  ENT600: { session: '2', start: '16:30', end: '18:30', room: 'TH03', tbc: false },
  TMC451: { session: '2', start: '16:30', end: '18:30', room: '', tbc: false },
  TMC501: { session: '1', start: '16:30', end: '18:30', room: '', tbc: false },
  // Semester 3 subjects (taken this semester)
  MAT423: { session: '2', start: '08:30', end: '10:30', room: 'TH04', tbc: false },
  CSC510: { session: '1', start: '16:30', end: '18:30', room: 'BK36', tbc: false },
  TMC401: { session: '1', start: '14:30', end: '16:30', room: 'BK21', tbc: false },
  ISP565: { session: '2', start: '10:30', end: '12:30', room: 'BK26', tbc: false },
  CSC645: { session: '2', start: '14:30', end: '16:30', room: 'MK20', tbc: false }
};

const DEFAULT_COURSES = [
  ['CSC435','OBJECT-ORIENTED PROGRAMMING',3,4,false], ['CSC508','DATA STRUCTURES',3,5,false],
  ['CSC562','INFORMATION RETRIEVAL AND SEARCHING ALGORITHMS',3,10,true], ['CSC569','PRINCIPLES OF COMPILERS',3,5,false],
  ['CSC574','DYNAMIC WEB APPLICATION DEVELOPMENT',3,7,true], ['CSC575','SOFTWARE PROJECT MANAGEMENT',3,8,true],
  ['CSC577','SOFTWARE ENGINEERING - THEORIES AND PRINCIPLES',3,5,false], ['CSC580','PARALLEL PROCESSING',3,7,false],
  ['CSC583','ARTIFICIAL INTELLIGENCE ALGORITHMS',3,5,false], ['CSC584','ENTERPRISE PROGRAMMING',3,6,false],
  ['CSC649','SPECIAL TOPICS IN COMPUTER SCIENCE',3,9,false], ['CSC662','COMPUTER SECURITY',3,8,false],
  ['CSP600','PROJECT FORMULATION',3,9,false], ['CSP650','PROJECT',6,10,false], ['CST688','COMPUTING SCIENCE INDUSTRIAL TRAINING',7,11,false],
  ['ENT600','TECHNOLOGY ENTREPRENEURSHIP',3,9,false], ['ICT502','DATABASE ENGINEERING',3,6,false], ['ICT652','ETHICAL, SOCIAL, AND PROFESSIONAL ISSUES IN ICT',3,9,false],
  ['LCC401','ENGLISH FOR MEDIATING TEXTS',2,1,false], ['LCC500','ENGLISH FOR WORKPLACE COMMUNICATION',2,6,false],
  ['STA416','APPLIED PROBABILITY AND STATISTICS',3,4,false], ['TMC451','INTRODUCTORY MANDARIN (LEVEL II)',2,7,true], ['TMC501','INTRODUCTORY MANDARIN (LEVEL III)',2,8,true]
].map(([code,name,credits,part,elective]) => ({ id: `catalogue-${code}`, code, name, credits, part, type: elective ? 'Elective' : 'Core', session: '1', start: '08:00', end: '10:00', room: '', selected: false, tbc: true, ...(A_GROUP_TIMES[code] || {}) }));
