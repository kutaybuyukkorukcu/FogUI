#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

const program = new Command();

program
  .name('fogui')
  .description('CLI for FogUI')
  .version('0.1.0');

program
  .command('create')
  .description('Create a new FogUI adapter')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: 'Which framework are you using?',
        choices: ['Next.js', 'Vite', 'Create React App'],
      },
      {
        type: 'list',
        name: 'styling',
        message: 'Which styling solution are you using?',
        choices: ['Tailwind CSS', 'CSS Modules', 'Styled Components'],
      },
      {
        type: 'list',
        name: 'components',
        message: 'Which component library are you using?',
        choices: ['Shadcn/UI', 'Material-UI (MUI)', 'Chakra UI', 'Headless UI'],
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Where should we save the adapter file?',
        default: 'src/fogui.adapter.ts',
       },
       {
         type: 'input',
         name: 'componentsPath',
         message: 'What is the import path for your UI components?',
         default: 'src/components/ui',
       },
    ]);

       if (answers.components === 'Shadcn/UI') {
        const dir = path.dirname(answers.outputPath);
        try {
          await fs.access(dir);
        } catch {
          const { createDir } = await inquirer.prompt([{
            type: 'confirm',
            name: 'createDir',
            message: `Directory ${dir} does not exist. Create it?`,
            default: true,
          }]);
          if (createDir) {
            await fs.mkdir(dir, { recursive: true });
          } else {
            console.log('Aborting.');
            return;
          }
        }
  
        try {
          await fs.access(answers.outputPath);
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `File ${answers.outputPath} already exists. Overwrite it?`,
            default: false,
          }]);
          if (!overwrite) {
            console.log('Aborting.');
            return;
          }
        } catch {
          // File does not exist, so we can proceed
        }
  
        const templatePath = path.join(__dirname, 'templates/shadcn.adapter.ts.tpl');
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        const output = template({ componentsPath: answers.componentsPath });
  
        await fs.writeFile(answers.outputPath, output);
        console.log(`\n✅ Shadcn/UI adapter created at ${answers.outputPath}`);
        console.log('\nNext steps:');
        console.log('1. Import the adapter in your main App file (e.g., App.tsx or layout.tsx).');
        console.log('2. Wrap your application with the FogUIProvider.');
        console.log('3. Make sure the component import path in the adapter is correct.');
      } else {
        console.log('\nThis CLI currently only supports Shadcn/UI. More adapters are coming soon!');
      }
  });

program.parse();
