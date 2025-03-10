// routes: /viewer
const express = require("express");
const router = express.Router();


//Route view post page
router.get("/view-questboard", (req, res, next) => {
  const account_id = req.session.account_id; // Get account_id from the session
  const sortBy = req.query.sortBy || "published_at";
  const tag = req.query.tag || "";

  // Build the query - add tag filtering if a tag is selected
  let queryPublished = `
    SELECT articles.*, 
           accounts.account_username AS created_by,
           tags.tag_name AS tag
    FROM articles 
    JOIN accounts ON articles.account_id = accounts.account_id 
    LEFT JOIN article_tags ON articles.article_id = article_tags.article_id
    LEFT JOIN tags ON article_tags.tag_id = tags.tag_id
    WHERE articles.publish_status = 1`;

  // Add tag filtering to the WHERE clause if a tag is selected
  if (tag) {
    queryPublished += ` AND tags.tag_name LIKE '%${tag}%'`;
  }

  // Add the ORDER BY clause
  queryPublished += ` ORDER BY ${sortBy} DESC`;

  global.db.all(queryPublished, function (err, published) {
    if (err) {
      return next(err);
    } else {
      if (account_id) {
        const queryUsername =
          "SELECT account_username FROM accounts WHERE account_id = ?";
        const params = [account_id];

        global.db.get(queryUsername, params, function (err, row) {
          if (err) {
            return next(err);
          } else if (row) {
            const account_username = row.account_username;
            res.render("view-questboard.ejs", {
              articlePublished: published,
              account_username: account_username,
              sortBy: sortBy,
              selectedTag: tag,
            });
          } else {
            res.status(404).send("Account not found");
          }
        });
      } else {
        res.render("view-questboard.ejs", {
          articlePublished: published,
          account_username: undefined,
          sortBy: sortBy,
          selectedTag: tag,
        });
      }
    }
  });
});

// Route to view the post
router.get("/view-post/:id", (req, res, next) => {
  const account_id = req.session.account_id;
  const articleId = req.params.id;

  const articleQuery = `
    SELECT articles.*, accounts.account_username AS created_by 
    FROM articles 
    JOIN accounts ON articles.account_id = accounts.account_id 
    WHERE articles.article_id = ?`;
  global.db.get(articleQuery, [articleId], (err, article) => {
    if (err) {
      return next(err);
    }

    if (!article || article.publish_status === 0) {
      return res.status(404).send("Post not found");
    }

    const incrementReadsQuery = `UPDATE articles SET click_counter = click_counter + 1 WHERE article_id = ?`;
    global.db.run(incrementReadsQuery, [articleId], (err) => {
      if (err) {
        return next(err);
      }

      const commentsQuery = `
        SELECT comments.*, accounts.account_username AS user_name 
        FROM comments 
        JOIN accounts ON comments.account_id = accounts.account_id 
        WHERE comments.article_id = ? 
        ORDER BY comments.published_at DESC`;
      global.db.all(commentsQuery, [articleId], (err, comments) => {
        if (err) {
          return next(err);
        }

        if (account_id) {
          const queryUsername =
            "SELECT account_username FROM accounts WHERE account_id = ?";
          const params = [account_id];

          global.db.get(queryUsername, params, function (err, row) {
            if (err) {
              return next(err);
            } else if (row) {
              const account_username = row.account_username;
              res.render("view-post.ejs", {
                article: article,
                comments: comments,
                account_id: account_id, // Pass account_id to the template
                account_username: account_username,
              });
            } else {
              res.status(404).send("Account not found");
            }
          });
        } else {
          res.render("view-post.ejs", {
            article: article,
            comments: comments,
            account_id: undefined, // Pass undefined if account_id is not available
            account_username: undefined,
          });
        }
      });
    });
  });
});

// Route to handle comments
router.post("/comment", (req, res, next) => {
  const account_id = req.session.account_id; // Get account_id from the session
  const article_id = req.body.article_id;
  const comment_text = req.body.comment;
  const published_at = new Date().toLocaleString();

  // Fetch the username using account_id
  const queryUsername =
    "SELECT account_username FROM accounts WHERE account_id = ?";
  global.db.get(queryUsername, [account_id], (err, row) => {
    if (err) {
      return next(err);
    } else if (row) {
      const user_name = row.account_username;

      // Insert comment
      const query = `INSERT INTO comments (article_id, account_id, comment_text, published_at)
                VALUES (?, ?, ?, ?)`;
      const params = [article_id, account_id, comment_text, published_at];

      global.db.run(query, params, function (err) {
        if (err) {
          return next(err);
        }
        res.redirect(`/viewer/view-post/${article_id}`);
      });
    } else {
      res.status(404).send("Account not found");
    }
  });
});

//Handle Like Count
router.get("/like/:id", (req, res, next) => {
  const articleId = req.params.id;

  // Update likes_count to database
  const query =
    "UPDATE articles SET likes_count = likes_count + 1, click_counter = click_counter -1 WHERE article_id = ?";
  global.db.run(query, [articleId], (err) => {
    if (err) {
      return next(err);
    }
    res.redirect(`/viewer/view-post/${req.params.id}`);
  });
});

// Route to view/manage quest info
router.get("/user-questinfo/:id", (req, res, next) => {
  const questId = req.params.id;
  const account_id = req.session.account_id; // Get account_id from the session

  const query = `SELECT * FROM articles WHERE article_id = ?`;
  global.db.get(query, [questId], (err, article) => {
    if (err) {
      return next(err);
    }

    if (!article) {
      return res.status(404).send("Quest not found");
    }

    const commentsQuery = `
            SELECT comments.*, accounts.account_username AS user_name 
            FROM comments 
            JOIN accounts ON comments.account_id = accounts.account_id 
            WHERE comments.article_id = ? 
            ORDER BY comments.published_at DESC`;
    global.db.all(commentsQuery, [questId], (err, comments) => {
      if (err) {
        return next(err);
      }

      const helpersQuery = `
                SELECT helpers.helper_id AS id, helpers.*, accounts.account_username AS user_name 
                FROM helpers 
                JOIN accounts ON helpers.account_id = accounts.account_id 
                WHERE helpers.article_id = ?`;
      global.db.all(helpersQuery, [questId], (err, helpers) => {
        if (err) {
          return next(err);
        }

        if (account_id) {
          const queryUsername =
            "SELECT account_username FROM accounts WHERE account_id = ?";
          global.db.get(queryUsername, [account_id], (err, row) => {
            if (err) {
              return next(err);
            } else if (row) {
              const account_username = row.account_username;
              res.render("user-questinfo.ejs", {
                article: article,
                comments: comments,
                helpers: helpers, // Pass helpers to the template
                account_id: account_id,
                account_username: account_username,
              });
            } else {
              res.status(404).send("Account not found");
            }
          });
        } else {
          res.render("user-questinfo.ejs", {
            article: article,
            comments: comments,
            helpers: helpers, // Pass helpers to the template
            account_id: undefined,
            account_username: undefined,
          });
        }
      });
    });
  });
});

// Route to handle helper form submission
router.post("/helper", (req, res, next) => {
  const account_id = req.session.account_id; // Get account_id from the session
  const article_id = req.body.article_id;

  if (article_id && account_id) {
    const query = `INSERT INTO helpers (article_id, account_id) VALUES (?, ?)`;
    global.db.run(query, [article_id, account_id], function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/viewer/view-questboard"); // Redirect to quest board or any other page
    });
  } else {
    res.status(400).send("Invalid request");
  }
});

// Route to handle helper deletion
router.post("/helpers/delete/:id", (req, res, next) => {
  const helperId = req.params.id;
  const articleId = req.body.article_id;

  const query = "DELETE FROM helpers WHERE helper_id = ?";
  global.db.run(query, [helperId], (err) => {
    if (err) {
      return next(err);
    }
    res.redirect(`/viewer/user-questinfo/${articleId}`); // Redirect to user-questinfo page with article_id
  });
});

// Route to handle rewarding a helper
router.post("/helpers/reward/:helper_id", async (req, res, next) => {
  const helperId = req.params.helper_id;
  const articleId = req.body.article_id;
  const currentUserId = req.session.account_id;

  try {
    // Retrieve the reward amount from the articles table
    const article = await new Promise((resolve, reject) => {
      global.db.get(
        "SELECT reward_amount FROM articles WHERE article_id = ?",
        [articleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const rewardAmount = article.reward_amount;

    // Update the helper's reward points
    await new Promise((resolve, reject) => {
      global.db.run(
        "UPDATE rewardpoints SET reward_points = reward_points + ? WHERE account_id = ?",
        [rewardAmount, helperId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Deduct the reward points from the current user's reward points
    await new Promise((resolve, reject) => {
      global.db.run(
        "UPDATE rewardpoints SET reward_points = reward_points - ? WHERE account_id = ?",
        [rewardAmount, currentUserId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Delete the helper after rewarding
    await new Promise((resolve, reject) => {
      global.db.run(
        "DELETE FROM helpers WHERE helper_id = ?",
        [helperId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.redirect(`/viewer/user-questinfo/${articleId}`); // Redirect to the appropriate page after rewarding
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
