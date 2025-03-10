/**
    /SiDE Quest POST pages routing 
 */

const express = require("express");
const router = express.Router();

//Addition Variables
const emailSymbol = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// display all accounts
router.get("/list-articles", (req, res, next) => {
  const query = "SELECT * FROM articles";

  global.db.all(query, function (err, rows) {
    if (err) {
      next(err);
    } else {
      res.json(rows);
    }
  });
});

// Route to view reward points
router.get("/view-reward", (req, res, next) => {
  const account_id = req.session.account_id; 

  if (account_id) {
    const queryRewardPoints = "SELECT reward_points FROM rewardpoints WHERE account_id = ?";
    const queryUsername = "SELECT account_username FROM accounts WHERE account_id = ?";
    const queryRewards = "SELECT reward_name, reward_cost FROM rewards";
    const params = [account_id];

    global.db.get(queryRewardPoints, params, function (err, rewardRow) {
      if (err) {
        return next(err);
      } else if (rewardRow) {
        global.db.get(queryUsername, params, function (err, userRow) {
          if (err) {
            return next(err);
          } else if (userRow) {
            global.db.all(queryRewards, [], function (err, rewards) {
              if (err) {
                return next(err);
              }
              res.render("rewardpage.ejs", { 
                reward_points: rewardRow.reward_points,
                account_username: userRow.account_username,
                rewards: rewards
              });
            });
          } else {
            res.status(404).send("Account not found");
          }
        });
      } else {
        res.status(404).send("Reward points not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

// Route to claim reward
router.post("/claim-reward", (req, res, next) => {
  const account_id = req.session.account_id;
  const { reward_name, reward_cost } = req.body;

  if (account_id) {
    const queryRewardPoints = "SELECT reward_points FROM rewardpoints WHERE account_id = ?";
    const params = [account_id];

    global.db.get(queryRewardPoints, params, function (err, rewardRow) {
      if (err) {
        return next(err);
      } else if (rewardRow) {
        if (rewardRow.reward_points >= reward_cost) {
          const newPoints = rewardRow.reward_points - reward_cost;
          const updatePointsQuery = "UPDATE rewardpoints SET reward_points = ? WHERE account_id = ?";
          global.db.run(updatePointsQuery, [newPoints, account_id], function (err) {
            if (err) {
              return next(err);
            }
            res.redirect("/user/view-reward");
          });
        } else {
          res.status(400).send("Not enough points to claim this reward");
        }
      } else {
        res.status(404).send("Reward points not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

// display all quest taken
router.get('/view-questtaken', (req, res, next) => {
  const accountId = req.session.account_id; // Get account_id from session

  if (accountId) {
    const queryHelperArticles = 'SELECT article_id FROM helpers WHERE account_id = ?';
    global.db.all(queryHelperArticles, [accountId], (err, helperArticles) => {
      if (err) {
        return next(err);
      }

      const articleIds = helperArticles.map(helper => helper.article_id);

      if (articleIds.length > 0) {
        const queryArticles = `
          SELECT articles.*, 
           accounts.account_username AS created_by, 
           GROUP_CONCAT(tags.tag_name) AS tags
           FROM articles 
           JOIN accounts ON articles.account_id = accounts.account_id 
           LEFT JOIN article_tags ON articles.article_id = article_tags.article_id
           LEFT JOIN tags ON article_tags.tag_id = tags.tag_id
           WHERE articles.article_id IN (${articleIds.map(() => '?').join(',')})
           GROUP BY articles.article_id, accounts.account_username
        `;
        global.db.all(queryArticles, articleIds, (err, articles) => {
          if (err) {
            return next(err);
          }
          res.render('view-questtaken', { articlePublished: articles });
        });
      } else {
        res.render('view-questtaken', { articlePublished: [] });
      }
    });
  } else {
    res.redirect('/homepage'); // Redirect to homescreen if not logged in
  }
});

// display session account details
router.get("/view-profile", (req, res, next) => {
  const account_id = req.session.account_id;

  if (account_id) {
    const queryAccount = "SELECT * FROM accounts WHERE account_id = ?";
    const queryRewardPoints = "SELECT reward_points FROM rewardpoints WHERE account_id = ?";
    const params = [account_id];

    global.db.get(queryAccount, params, function (err, accountRow) {
      if (err) {
        return next(err);
      } else if (accountRow) {
        global.db.get(queryRewardPoints, params, function (err, rewardRow) {
          if (err) {
            return next(err);
          } else {
            const accountDetails = {
              ...accountRow,
              reward_points: rewardRow ? rewardRow.reward_points : 0
            };
            res.render("view-profile.ejs", accountDetails); // Render view-profile.ejs with account details and reward points
          }
        });
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

router.get("/create-account", (req, res) => {
  res.render("create_account.ejs", { error: null });
});

// account creation
router.post("/create-account", (req, res, next) => {
  const {
    account_username,
    account_email,
    account_address,
    account_phonenumber,
    account_password,
  } = req.body;

  // Check if the email format is valid
  if (!emailSymbol.test(account_email)) {
    return res.render("create_account.ejs", {
      error: "Please enter a valid email address.",
    });
  }

  // Check if email already exists
  const emailCheckQuery = "SELECT * FROM accounts WHERE account_email = ?";
  global.db.get(emailCheckQuery, [account_email], function (err, row) {
    if (err) {
      return next(err);
    }
    if (row) {
      // Do not populate the database with duplicate emails.
      return res.render("create_account.ejs", {
        error: "This email is already registered. Please choose another.",
      });
    } else {
      // Proceed with account creation
      const query = `
        INSERT INTO accounts (account_username, account_email, account_address, account_phonenumber, account_password)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [
        account_username,
        account_email,
        account_address,
        account_phonenumber,
        account_password,
      ];

      global.db.run(query, params, function (err) {
        if (err) {
          return next(err);
        }
        res.redirect("/login"); // Redirect to login after successful account creation
      });
    }
  });
});

router.get("/user-post", (req, res, next) => {
  const account_id = req.session.account_id;

  if (account_id) {
    const queryUsername =
      "SELECT account_username FROM accounts WHERE account_id = ?";
    const params = [account_id];

    global.db.get(queryUsername, params, function (err, row) {
      if (err) {
        return next(err);
      } else if (row) {
        const account_username = row.account_username;

        const queryPublished = `
    SELECT articles.*, 
           accounts.account_username AS created_by, 
           tags.tag_name AS tag
           FROM articles 
           JOIN accounts ON articles.account_id = accounts.account_id 
           LEFT JOIN article_tags ON articles.article_id = article_tags.article_id
           LEFT JOIN tags ON article_tags.tag_id = tags.tag_id
           WHERE articles.publish_status = 1 AND articles.account_id = ?`;

        const queryDraft = `
    SELECT articles.*, 
           accounts.account_username AS created_by, 
           tags.tag_name AS tag
           FROM articles 
           JOIN accounts ON articles.account_id = accounts.account_id 
           LEFT JOIN article_tags ON articles.article_id = article_tags.article_id
           LEFT JOIN tags ON article_tags.tag_id = tags.tag_id
           WHERE articles.publish_status = 0 AND articles.account_id = ?`;

        global.db.all(queryPublished, [account_id], function (err, published) {
          if (err) {
            return next(err);
          } else {
            global.db.all(queryDraft, [account_id], function (err, draft) {
              if (err) {
                return next(err);
              } else {
                res.render("user-post.ejs", {
                  articlePublished: published,
                  articleDraft: draft,
                  account_username: account_username,
                  article: null, // Ensure article is defined
                  comments: [], // Ensure comments is defined
                });
              }
            });
          }
        });
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});


// Route to edit post page
router.get("/post-edit", (req, res, next) => {
  const account_id = req.session.account_id;

  if (account_id) {
    const queryUsername = "SELECT account_username FROM accounts WHERE account_id = ?";
    const queryRewardPoints = "SELECT reward_points FROM rewardpoints WHERE account_id = ?";
    const params = [account_id];

    global.db.get(queryUsername, params, function (err, row) {
      if (err) {
        return next(err);
      } else if (row) {
        const account_username = row.account_username;
        global.db.get(queryRewardPoints, params, function (err, rewardRow) {
          if (err) {
            return next(err);
          } else {
            const reward_points = rewardRow ? rewardRow.reward_points : 0;
            res.render("post-edit.ejs", {
              article: null,
              account_username: account_username,
              reward_points: reward_points,
            });
          }
        });
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

router.get("/post-edit/:id", (req, res, next) => {
  const account_id = req.session.account_id; // Get account_id from the session
  const articleId = req.params.id;

  if (account_id) {
    const queryUsername = "SELECT account_username FROM accounts WHERE account_id = ?";
    const queryRewardPoints = "SELECT reward_points FROM rewardpoints WHERE account_id = ?";
    const params = [account_id];

    global.db.get(queryUsername, params, function (err, row) {
      if (err) {
        return next(err);
      } else if (row) {
        const account_username = row.account_username;
        global.db.get(queryRewardPoints, params, function (err, rewardRow) {
          if (err) {
            return next(err);
          } else {
            const reward_points = rewardRow ? rewardRow.reward_points : 0;
            if (articleId) {
              const query = "SELECT * FROM articles WHERE article_id = ?";
              global.db.get(query, [articleId], (err, article) => {
                if (err) {
                  return next(err);
                }
                res.render("post-edit.ejs", {
                  article,
                  account_username: account_username,
                  reward_points: reward_points,
                });
              });
            } else {
              res.render("post-edit.ejs", {
                article: null,
                account_username: account_username,
                reward_points: reward_points,
              });
            }
          }
        });
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

// save button
router.post("/save", (req, res, next) => {
  const currentDate = new Date().toLocaleString();
  const account_id = req.session.account_id;
  const tags = req.body.tags; // Get selected tags
  const reward_give = req.body.reward_give; // Get reward_give input

  if (req.body.article_id) {
    const queryUpdate =
      "UPDATE articles SET title = ?, content = ?, updated_at = ?, account_id = ?, reward_amount = ? WHERE article_id = ?";
    global.db.run(
      queryUpdate,
      [
        req.body.title,
        req.body.content,
        currentDate,
        account_id,
        reward_give,
        req.body.article_id,
      ],
      (err) => {
        if (err) {
          return next(err);
        }
        // Update tags
        updateTags(req.body.article_id, tags, res, next);
      }
    );
  } else {
    const queryInsert =
      "INSERT INTO articles (title, content, created_at, updated_at, account_id, reward_amount, publish_status) VALUES (?, ?, ?, ?, ?, ?, 0)";
    global.db.run(
      queryInsert,
      [req.body.title, req.body.content, currentDate, currentDate, account_id, reward_give],
      function (err) {
        if (err) {
          return next(err);
        }
        const article_id = this.lastID; // Get the ID of the newly inserted article
        // Insert tags
        updateTags(article_id, tags, res, next);
      }
    );
  }
});

// publish button
router.post("/publish", (req, res, next) => {
  const currentDate = new Date().toLocaleString();
  const account_id = req.session.account_id;
  const tags = req.body.tags; // Get selected tags
  const reward_give = req.body.reward_give; // Get reward_give input

  if (account_id) {
    const queryCheckAccount =
      "SELECT account_id FROM accounts WHERE account_id = ?";
    global.db.get(queryCheckAccount, [account_id], (err, row) => {
      if (err) {
        return next(err);
      } else if (row) {
        if (req.body.article_id) {
          const queryUpdate =
            "UPDATE articles SET title = ?, content = ?, updated_at = ?, published_at = ?, account_id = ?, reward_amount = ?, publish_status = 1 WHERE article_id = ?";
          global.db.run(
            queryUpdate,
            [
              req.body.title,
              req.body.content,
              currentDate,
              currentDate,
              account_id,
              reward_give,
              req.body.article_id,
            ],
            (err) => {
              if (err) {
                return next(err);
              }
              // Update tags
              updateTags(req.body.article_id, tags, res, next);
            }
          );
        } else {
          const queryInsert =
            "INSERT INTO articles (title, content, created_at, updated_at, published_at, account_id, reward_amount, publish_status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
          global.db.run(
            queryInsert,
            [
              req.body.title,
              req.body.content,
              currentDate,
              currentDate,
              currentDate,
              account_id,
              reward_give,
            ],
            function (err) {
              if (err) {
                return next(err);
              }
              const article_id = this.lastID; // Get the ID of the newly inserted article
              // Insert tags
              updateTags(article_id, tags, res, next);
            }
          );
        }
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

// delete button
router.get("/delete/:id", (req, res, next) => {
  const articleId = req.params.id;

  const deleteCommentsQuery = "DELETE FROM comments WHERE article_id = ?";
  global.db.run(deleteCommentsQuery, [articleId], function (err) {
    if (err) {
      return next(err);
    }

    const deleteArticleTagsQuery = "DELETE FROM article_tags WHERE article_id = ?";
    global.db.run(deleteArticleTagsQuery, [articleId], function (err) {
      if (err) {
        return next(err);
      }

      const deleteArticleQuery = "DELETE FROM articles WHERE article_id = ?";
      global.db.run(deleteArticleQuery, [articleId], function (err) {
        if (err) {
          return next(err);
        }
        res.redirect("/user/user-post");
      });
    });
  });
});

// account login
router.post("/login", (req, res, next) => {
  const { account_username, account_password } = req.body;

  const query = `
            SELECT account_id FROM accounts 
            WHERE account_username = ? AND account_password = ?
        `;
  const params = [account_username, account_password];

  global.db.get(query, params, function (err, row) {
    if (err) {
      next(err);
    } else if (row) {
      req.session.account_id = row.account_id; // Store account_id in session
      res.redirect("/homepage"); // Redirect to homepage after login
    } else {
      res.render("homescreen.ejs", { error: "Invalid username or password" }); // Render homescreen with error
    }
  });
});

// Redirect to homescreen on the initial access
router.get("/", (req, res) => {
  res.redirect("/homescreen"); // Change this to redirect to homescreen
});

// Route to about-us
router.get("/about-us", (req, res) => {
  res.render("about-us.ejs");
});

// Route for homepage
router.get("/homepage", (req, res, next) => {
  const account_id = req.session.account_id;

  if (account_id) {
    const query = "SELECT account_username FROM accounts WHERE account_id = ?";
    const params = [account_id];

    global.db.get(query, params, function (err, row) {
      if (err) {
        next(err);
      } else if (row) {
        res.render("homepage.ejs", { account_username: row.account_username });
      } else {
        res.status(404).send("Account not found");
      }
    });
  } else {
    res.redirect("/homescreen"); // Redirect to homescreen if not logged in
  }
});

/////////////////////////////////////////// Helper Functions ///////////////////////////////////////////

// Helper function to update tags
function updateTags(article_id, tags, res, next) {
  const deleteQuery = "DELETE FROM article_tags WHERE article_id = ?";

  if (!Array.isArray(tags)) {
    try {
      tags = JSON.parse(tags);
    } catch (error) {
      if (typeof tags === "string") {
        tags = tags.split(",").map((tag) => tag.trim());
      } else {
        tags = []; // Tags array
      }
    }
  }

  global.db.run(deleteQuery, [article_id], function (err) {
    if (err) {
      return next(err);
    }
    // Then, insert new tags
    if (tags && tags.length > 0) {
      const insertQuery =
        "INSERT INTO article_tags (article_id, tag_id) VALUES (?, (SELECT tag_id FROM tags WHERE tag_name = ?))";
      tags.forEach((tag) => {
        global.db.run(insertQuery, [article_id, tag], function (err) {
          if (err) {
            return next(err);
          }
        });
      });
    }
    res.redirect("/user/user-post");
  });
}

module.exports = router;
