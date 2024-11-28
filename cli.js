#!/usr/bin/env node

import { program } from 'commander';
import { join } from 'path';
import { execaNode } from 'execa';
import { readFile } from 'fs/promises';

function buildOptionBlock(option) {
  return `#### \`${option.option}\`

${option.description}

TODO: write more here. Be creative, think of the user and how you want them to use your script 🎉`;
}

program
  .name('commander-docs')
  .description(
    'A Simple command to verify you have documented your commander.js programs correctly in your README',
  )
  .option(
    '--doc',
    'The file to make sure that you have documented',
    'README.md',
  )
  .argument(
    '<script>',
    'The script that you want to check you have documented',
  );

program.parse();

let usage;
let args = [];
let options = [];

let mode;

for await (let line of execaNode`${program.args[0]} --help`) {
  if (line.startsWith('Usage:')) {
    usage = line.replace(/^Usage: /, '');
  }

  if (line.trim().length === 0) {
    continue;
  }

  if (line.startsWith('Arguments:')) {
    mode = 'arguments';
    continue;
  }

  if (line.startsWith('Options:')) {
    mode = 'options';
    continue;
  }

  if (mode === 'arguments') {
    const [, arg, description] = /\s+(\w+)\s*(.*)/.exec(line);
    args.push({ arg, description });
  }

  if (mode === 'options') {
    const shortForm = /\s+(-\w+, --\w+)\s+(.*)/.exec(line);
    if (shortForm) {
      const [, option, description] = shortForm;

      // we don't need to warn people to document help
      if (option === '-h, --help') {
        continue;
      }

      options.push({
        option,
        description,
      });
    } else {
      // TODO I couldn't figure out how to boil these down to one regex 🙈
      // help wanted 🤣
      const [, option, description] = /\s+(--\w+)\s*(.*)/.exec(line);

      options.push({
        option,
        description,
      });
    }
  }
}

let fileContents;

try {
  fileContents = await readFile(
    join(process.cwd(), program.opts().doc),
    'utf-8',
  );
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`Document at path ${program.opts().doc} does not exist`);
  } else {
    console.error(`Unknown error: ${err.message}`);
  }

  process.exit(1);
}

if (!fileContents.includes(usage)) {
  console.error(`You have not included your usage script anywhere in your docs. We recommend that you at least add the following section:

## Usage

\`${usage}\``);
  process.exit(1);
}

if (options.length) {
  if (!fileContents.includes('### Options')) {
    console.error(`You have not included an Options header anywhere in your docs. We recommend that you at add the following section (ideally under ## Usage):

### Options

${options.map(buildOptionBlock).join('\n\n')}`);
    process.exit(1);
  }

  for (let option of options) {
    if (!fileContents.match(new RegExp(`###.*${option.option}`))) {
      console.error(`You have not included a dection detailing how to use the '${option.option}' Option. We recommend that you at add the following section (ideally under ### Options):

${buildOptionBlock(option)}`);
      process.exit(1);
    }
  }
}
