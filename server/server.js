//init project
// const express = require("express");
// const app = express();
// const cors = require("cors");
// const fs = require("fs");

// app.use(cors());
// const path = require("path");
// app.use(express.static(path.join(__dirname, "public")));
// const bodyParser = require("body-parser");
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
// const session = require("express-session");
// app.use(session({ secret: "secret key" }));
// app.use(express.json());
const express = require("express");
require('express-async-errors');
const app = express();
const fs = require("fs");

const cors = require('cors');
const {registerPassport, loginApi} = require('./modules/auth')

app.use(express.json());
app.use(cors());

registerPassport(app)
app.use('/auth', loginApi)

const mongoose = require("mongoose");

const mongoDB =
  'mongodb+srv://' +
  process.env.MONGO_USERNAME +
  ':' +
  process.env.MONGO_PASSWD +
  '@' +
  process.env.MONGO_HOST +
  '/' +
  process.env.MONGO_DATABASE;

mongoose.connect(mongoDB, { useNewUrlParser: true, retryWrites: true });

const course = require("./schema/course.js");
const student = require("./schema/student.js");
const teacher = require("./schema/teacher.js");
const selection = require("./schema/selection.js");
const teacherUser = require("./schema/teacherUser.js");
const studentUser = require("./schema/studentUser.js");
const res = require("express/lib/response");

// const abc = new mongoose.Schema({test: String})
// const abcModel = mongoose.model("abc", abc);

app.get("/", async function (request, response) {
  const res = await teacher.find({});
  response.json({
    res,
    message: "Please see the README.md for documentation",
  });
});

//retrive courses which have been chosen by student
app.post("/havechosen", async function (request, response) {
  const { student_id } = request.user
  const course_list = await course.find({});
  console.log(course_list);
  const stu = await student.findOne({ student_id: student_id });
  console.log(stu);
  student_id = stu._id;
  const res = await selection
    .find({ student_id: student_id })
    .populate("course_id");
  //找不在selction里面的course
  console.log(res);
  let map = {};
  res.forEach((item) => {
    map[item.course_id.course_id] = 1;
  });
  const result = course_list.filter((item) => {
    return map[item.course_id] == 1;
  });
  response.send(result);
});

////retrive courses which have not been chosen by student
app.post("/couldchose", async function (request, response) {
  const { student_id } = request.user
  const course_list = await course.find({});
  console.log(course_list);
  const stu = await student.findOne({ student_id: student_id });
  console.log(stu);
  student_id = stu._id;
  const res = await selection
    .find({ student_id: student_id })
    .populate("course_id");
  //find the course which is not in selection
  console.log(res);
  let map = {};
  res.forEach((item) => {
    map[item.course_id.course_id] = 1;
  });
  const result = course_list.filter((item) => {
    return map[item.course_id] !== 1;
  });
  response.send(result);
});

app.post("/chengji", async function (request, response) {
  let student_id = request.body.student_id;
  const studentRes = await student.findOne({ student_id: student_id });
  if (!studentRes) {
    studentRes.send("error");
  }
  const selectionRes = await selection
    .find({ student_id: studentRes._id })
    .populate("course_id");
  if (!selectionRes) {
    selectionRes.send("error");
  }
  response.send(selectionRes);
});



//get student from course
app.post("/course_students", async function (request, response) {
  let { course_id } = request.body;
  console.log(course_id);
  const courseRes = await course.findOne({ course_id: course_id });
  console.log(courseRes);
  if (!courseRes) {
    response.send("cannot find the course");
  }
  course_id = courseRes._id;
  console.log(course_id);
  const selectionRes = await selection
    .find({ course_id: course_id })
    .populate("course_id")
    .populate("student_id");
  console.log(selectionRes);
  if (!selectionRes) {
    response.send("cannot find the selection!");
  }
  response.send(selectionRes);
});


app.post("/update_grade", async function (request, response) {
  const { student_id } = request.user
  let { course_id, grade } = request.body;
  const stuRes = await student.findOne({ student_id: student_id });
  if (!stuRes) {
    response.send("cannot find student");
  }

  const courseRes = await course.findOne({ course_id: course_id });
  if (!courseRes) {
    response.send("cannot find course");
  }
  const res = await selection.findOneAndUpdate(
    { student_id: stuRes._id, course_id: courseRes._id },
    { grade: grade }
  );
  if (!res) {
    response.send("cannot find result");
  }
});


//delete course of student
app.post("/drop_course", async function (request, response) {
  const { student_id } = request.user
  let { course_id } = request.body;
  const stu = await student.findOne({ student_id: student_id });
  const cou = await course.findOne({ course_id: course_id });
  let result = await selection.deleteMany({
    course_id: cou._id,
    student_id: stu._id,
  });
  if (!result) {
    response.send("delete error");
    return;
  }
  response.send(result);
  response.send("delete successful");
});

//create selection
app.post("/register_course", async function (request, response) {
  const { student_id } = request.user
  const { course_id } = request.body;
  let stuRes;
  let courRes;
  stuRes = await student.findOne({ student_id: student_id });
  courRes = await course.findOne({ course_id: course_id });
  const newSelection = {
    student_id: stuRes._id,
    course_id: courRes._id,
  };
  console.log(newSelection);
  const res = await selection.create(newSelection);
  if (!res) {
    res.send("selection error");
    return;
  }
  response.send(res);
});


app.get("/account", async function (request, response) {
  const account_student_list = await studentUser.find({}).populate("username");
  const account_teacher_list = await teacherUser.find({}).populate("username");
  const account_list = [
    ...account_student_list.map(e => ({
      department: e.username.department,
      ref_id: e.username.student_id,
      name: e.username.student_name,
      type: 'student',
      is_github_linked: !!e.github_id,
      _id: e._id
    })), 
    ...account_teacher_list.map(e => ({
      department: e.username.department,
      ref_id: e.username.teacher_id,
      name: e.username.teacher_name,
      type: 'teacher',
      is_github_linked: !!e.github_id,
      _id: e._id
    }))
  ];
  if (!account_list) {
    response.send("Cannot find users");
    return;
  }
  response.send(account_list);
});

app.delete("/account", async function (request, response) {
  const {_id, type} = request.body;

  let accountItem;
  if (type === 'student') {
    accountItem = studentUser.findOne({
      _id: _id
    })
  } else if (type === 'teacher') {
    accountItem = teacherUser.findOne({
      _id: _id
    })
  }
  if (!accountItem) {
    response.status(404);
    response.json({
      message: 'not found'
    })
    return
  }

  await accountItem.remove();

  response.json({
    status: 200
  })
});

app.get("/student", async function (request, response) {
  const student_list = await student.find({});
  console.log(student_list);
  if (!student_list) {
    response.send("Cannot find students");
    return;
  }
  response.send(student_list);
});

//add new student
app.post("/student", async function (request, response) {
  const { student_id, student_name, gender, age, department, fee } =
    request.body;
  const newStu = {
    student_id,
    student_name,
    gender,
    age,
    department,
    fee
  };
  console.log(newStu);
  const res = await student.create(newStu);

  if (!res) {
    response.status(500);
    response.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

// update student
app.put("/student", async function (request, response) {
  const { _id, student_id, student_name, gender, age, department, fee } =
    request.body;
  const item = await student.findOne({
    _id: _id
  })
  if (!item) {
    response.status(404);
    response.json({
      message: 'not found'
    })
    return
  }
  const newStu = {
    student_id,
    student_name,
    gender,
    age,
    department,
    fee
  };
  console.log(newStu);
  const res = await item.update(newStu);

  if (!res) {
    response.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

//get teacher information
app.get("/teacher", async function (request, response) {
  const teacher_list = await teacher.find({});
  console.log(teacher_list);
  if (!teacher_list) {
    response.json({
      exception: "Cannot find teachers",
    });
    return;
  }
  response.send(teacher_list);
});

//add teacher information
app.post("/teacher", async function (request, response) {
  const { teacher_id, teacher_name, department, position } = request.body;
  const newTeacher = {
    teacher_id,
    teacher_name,
    department,
    position,
  };
  console.log(newTeacher);
  const res = await teacher.create(newTeacher);

  if (!res) {
    res.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

// update teacher information
app.put("/teacher", async function (request, response) {
  const { _id, teacher_id, teacher_name, department, position } = request.body;
  const item = await teacher.findOne({
    _id: _id
  })
  if (!item) {
    response.status(404);
    response.json({
      message: 'not found'
    })
    return
  }
  const newTeacher = {
    teacher_id,
    teacher_name,
    department,
    position,
  };
  console.log(newTeacher);
  const res = await item.update(newTeacher);

  if (!res) {
    res.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

//find all courses in database
app.get("/course", async function (request, response) {
  let course_list;
  if (request.user.type === 'admin') {
    course_list = await course.find({}).populate("teacher_id");
  } else if (request.user.type === 'teacher') {
    const teacher_id = request.user._id;
    course_list = await course.find({
      teacher_id: teacher_id
    }).populate("teacher_id");
  }
  console.log(course_list);
  if (!course_list) {
    response.send("Cannot find course");
    return;
  }
  response.send(course_list);
});

//Add course information
app.post("/course", async function (request, response) {
  const { course_id, course_name, credit, department } =
    request.body;

  const newCourse = {
    course_id,
    course_name,
    credit,
    department,
  };
  if (request.user.type === 'admin') {
    newCourse.teacher_id = request.body.teacher_id
  } else if (request.user.type === 'teacher') {
    newCourse.teacher_id = request.user._id
  }
  console.log(newCourse);
  const res = await course.create(newCourse);

  if (!res) {
    res.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

app.put("/course", async function (request, response) {
  const { _id, course_id, course_name, credit, department } =
    request.body;

  const courseItem = await course.findOne({_id: _id});

  if (!courseItem) {
    res.status(404);
    res.json({
      message: "Not found"
    })
    return;
  }

  const newCourse = {
    course_id,
    course_name,
    credit,
    department,
  };
  if (request.user.type === 'admin' && request.body.teacher_id) {
    newCourse.teacher_id = request.body.teacher_id
  } else if (request.user.type === 'teacher') {
    if (courseItem.teacher_id !== request.user._id) {
      res.status(400);
      res.json({
        message: "cannot modify other teacher's course"
      })
      return
    }
  }
  console.log(newCourse);
  const res = await courseItem.update(newCourse);

  if (!res) {
    res.send("insert error");
    return;
  }
  console.log("save successfully：" + res);
  response.send(res);
});

app.delete("/course", async function (request, response) {
  const { _id } =
    request.body;

  const courseItem = await course.findOne({_id: _id});

  if (!courseItem) {
    res.status(404);
    res.json({
      message: "Not found"
    })
    return;
  }

  if (request.user.type === 'teacher') {
    if (courseItem.teacher_id !== request.user._id) {
      res.status(400);
      res.json({
        message: "cannot modify other teacher's course"
      })
      return
    }
  }
  
  await courseItem.remove();

  response.json({
    status: 200
  });
});

app.all('*', (req, res) => {
  res.status(404);
  res.send('not found');
});

//-------------------------------------
//handling middleware error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('server error, please try again later');
});
// app.use((err, req, res, next) => {
//   const result = JSON.parse(err);
//   let params = [];
//   for (let attr in result) {
//     if (attr != "path") {
//       params.push(attr + "=" + result[attr]);
//     }
//   }
//   res.redirect(`${result.path}?${params.join("&")}`);
// });
// // -------------------------------------


const listener = app.listen(parseInt(process.env.PORT || 3000) + 1, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
