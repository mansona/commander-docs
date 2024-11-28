import { execa } from 'execa';
import { Project } from 'fixturify-project';
import { describe, it, expect } from 'vitest';

async function createProject(files) {
  let project = new Project('test-app', '1.1.1', {
    files: {
      'index.js': `import { program } from 'commander';

program
.name('silly-cli')
.argument('<some-arg>')
.argument('<some-other-arg>', 'this time with a description')
.option('--first') // no description
.option('--second', 'this one has a descroption')
.option('-s, --separator <char>', 'this one has a description');

program.parse();


export default program;`,
      ...files,
    },
  });

  project.pkg.type = 'module';

  project.linkDevDependency('commander-docs', {
    resolveName: '.',
    baseDir: process.cwd(),
  });

  project.linkDevDependency('commander', {
    baseDir: process.cwd(),
  });

  await project.write();
  return project;
}

describe('Basic functionality', () => {
  it('warns if there is no README.md file', async () => {
    const project = await createProject({});
    let result;
    try {
      result = await execa({
        cwd: project.baseDir,
        preferLocal: true,
      })`commander-docs ./index.js`;
    } catch (error) {
      expect(error.stderr).to.toMatchInlineSnapshot(
        `"Document at path README.md does not exist"`,
      );
    }

    // this makes sure we actually threw an error
    expect(result).to.not.be.ok;
  });

  it('warns when you are missing all documentation blocks', async () => {
    const project = await createProject({
      'README.md': `# My test app thingy`,
    });
    let result;
    try {
      result = await execa({
        cwd: project.baseDir,
        preferLocal: true,
      })`commander-docs ./index.js`;
    } catch (error) {
      expect(error.stderr).to.toMatchInlineSnapshot(`
        "You have not included your usage script anywhere in your docs. We recommend that you at least add the following section:

        ## Usage

        \`silly-cli [options] <some-arg> <some-other-arg>\`"
      `);
    }

    // this makes sure we actually threw an error
    expect(result).to.not.be.ok;
  });

  it('warns when there is a missing options header block', async () => {
    const project = await createProject({
      'README.md': `# My test app thingy

## Usage

\`silly-cli [options] <some-arg> <some-other-arg>\`

This is pretty silly`,
    });
    let result;
    try {
      result = await execa({
        cwd: project.baseDir,
        preferLocal: true,
      })`commander-docs ./index.js`;
    } catch (error) {
      expect(error.stderr).to.toMatchInlineSnapshot(`
        "You have not included an Options header anywhere in your docs. We recommend that you at add the following section (ideally under ## Usage):

        ### Options

        #### \`--first\`



        TODO: write more here. Be creative, think of the user and how you want them to use your script 🎉

        #### \`--second\`

        this one has a descroption

        TODO: write more here. Be creative, think of the user and how you want them to use your script 🎉

        #### \`-s, --separator\`

        <char>  this one has a description

        TODO: write more here. Be creative, think of the user and how you want them to use your script 🎉"
      `);
    }

    // this makes sure we actually threw an error
    expect(result).to.not.be.ok;
  });

  it('warns when any the options is missing', async () => {
    const project = await createProject({
      'README.md': `# My test app thingy

## Usage

\`silly-cli [options] <some-arg> <some-other-arg>\`

This is pretty silly

### Options`,
    });
    let result;
    try {
      result = await execa({
        cwd: project.baseDir,
        preferLocal: true,
      })`commander-docs ./index.js`;
    } catch (error) {
      expect(error.stderr).to.toMatchInlineSnapshot(`
        "You have not included a dection detailing how to use the '--first' Option. We recommend that you at add the following section (ideally under ### Options):

        #### \`--first\`



        TODO: write more here. Be creative, think of the user and how you want them to use your script 🎉"
      `);
    }

    // this makes sure we actually threw an error
    expect(result).to.not.be.ok;
  });

  it('succeeds when you include all options', async () => {
    const project = await createProject({
      'README.md': `# My test app thingy

## Usage

\`silly-cli [options] <some-arg> <some-other-arg>\`

This is pretty silly

### Options

#### --first

#### --second

#### -s, --separator`,
    });
    let result = await execa({
      cwd: project.baseDir,
      preferLocal: true,
    })`commander-docs ./index.js`;

    expect(result.exitCode).to.equal(0);
  });
});
