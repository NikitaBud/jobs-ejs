const { app } = require('../app');
const Job = require('../models/Job');
const { seed_db, testUserPassword } = require('../utils/seed_db');
const get_chai = require('../utils/get_chai');
const factory = require('factory-bot');

describe('Job CRUD operations', function () {
  before(async () => {
    const { expect, request } = await get_chai();

    this.test_user = await seed_db();

    let req = request.execute(app).get('/session/logon').send();
    let res = await req;
    const textNoLineEnd = res.text.replaceAll('\n', '');
    this.csrfToken = /_csrf\" value=\"(.*?)\"/.exec(textNoLineEnd)[1];

    let cookies = res.headers['set-cookie'];
    this.csrfCookie = cookies.find((element) =>
      element.startsWith('csrfToken'),
    );

    const dataToPost = {
      email: this.test_user.email,
      password: testUserPassword,
      _csrf: this.csrfToken,
    };

    req = request
      .execute(app)
      .post('/session/logon')
      .set('Cookie', this.csrfCookie)
      .set('content-type', 'application/x-www-form-urlencoded')
      .redirects(0)
      .send(dataToPost);
    res = await req;
    cookies = res.headers['set-cookie'];
    this.sessionCookie = cookies.find((element) =>
      element.startsWith('connect.sid'),
    );
    expect(this.csrfToken).to.not.be.undefined;
    expect(this.sessionCookie).to.not.be.undefined;
    expect(this.csrfCookie).to.not.be.undefined;
  });

  it('should get the job list with 20 entries', async () => {
    const { expect, request } = await get_chai();

    const res = await request
      .execute(app)
      .get('/jobs')
      .set('Cookie', this.csrfCookie + ';' + this.sessionCookie)
      .send();

    expect(res).to.have.status(200);
    const parts = res.text.split('<tr>');
    expect(parts.length).to.equal(21); // 1 header + 20 job rows
  });

  it('should add a new job entry', async () => {
    const { expect, request } = await get_chai();

    const newJob = await factory.build('job'); // генерируем фейковый job

    const res = await request
      .execute(app)
      .post('/jobs/add')
      .set('Cookie', this.csrfCookie + ';' + this.sessionCookie)
      .set('content-type', 'application/x-www-form-urlencoded')
      .send({
        title: newJob.title,
        company: newJob.company,
        status: newJob.status,
        _csrf: this.csrfToken,
      });

    // Проверка по базе: должно стать 21 job
    const jobs = await Job.find({ createdBy: this.test_user._id });
    expect(jobs.length).to.equal(21);
  });

})