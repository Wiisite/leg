import fs from 'fs';

const filePath = 'server/routers.ts';
let content = fs.readFileSync(filePath, 'utf8');

// List of property endings that need a comma
const patterns = [
  /create: protectedProcedure[\s\S]*?}\)/g,
  /createDefault: protectedProcedure[\s\S]*?}\)/g,
  /generateGroupMatches: protectedProcedure[\s\S]*?}\)/g,
  /getStandings: publicProcedure[\s\S]*?}\)/g,
  /delete: protectedProcedure[\s\S]*?}\)/g,
  /generateSemifinals: protectedProcedure[\s\S]*?}\)/g,
  /generateFinal: protectedProcedure[\s\S]*?}\)/g
];

for (const pattern of patterns) {
  content = content.replace(pattern, (match) => {
    if (match.endsWith('})')) {
      return match + ',';
    }
    return match;
  });
}

fs.writeFileSync(filePath, content);
console.log('Commas added successfully');
