PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- User Posting Tables (Make a Request)
CREATE TABLE IF NOT EXISTS articles (
    article_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    publish_status INTEGER NOT NULL DEFAULT 0, -- 1=published, 0=draft 
    click_counter INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, --TIMESTAMP 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP DEFAULT NULL,
    reward_amount INTEGER NOT NULL DEFAULT 0,
    account_id INTEGER NOT NULL, -- link to the account id
    helper_id INTEGER DEFAULT NULL, -- link to the account id of the helper
    FOREIGN KEY (helper_id) REFERENCES helpers(helper_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- User Commenting Tables
CREATE TABLE IF NOT EXISTS comments (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL, -- link to the article id
    account_id INTEGER NOT NULL, -- link to the account id
    comment_text TEXT NOT NULL,
    published_at DATETIME NOT NULL, 
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Tags Table 
CREATE TABLE IF NOT EXISTS tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT NOT NULL UNIQUE
);

-- Article Tags Table Ref
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id),
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS rewardpoints (
    reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL, -- link to the account id
    reward_points INTEGER NOT NULL DEFAULT 100,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS helpers (
    helper_id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL, -- link to the article id that the helper is helping
    account_id INTEGER NOT NULL, -- link to the account id of the helper
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS rewards (
    reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_name TEXT NOT NULL,
    reward_cost INTEGER NOT NULL  -- cost of reward
);

-- Adding accounts
CREATE TABLE IF NOT EXISTS accounts (
    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_username TEXT NOT NULL,
    account_email TEXT NOT NULL,
    account_address TEXT NOT NULL,
    account_phonenumber TEXT NOT NULL,
    account_password TEXT NOT NULL
);

-- Trigger to add 100 reward points for each new account
CREATE TRIGGER IF NOT EXISTS add_initial_reward_points
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
    INSERT INTO rewardpoints (account_id, reward_points) VALUES (NEW.account_id, 100);
END;

-- Insert default data (For Testing)
INSERT INTO accounts (account_username, account_email, account_address, account_phonenumber, account_password) VALUES
('user1', 'user1@example.com', '123 Main St', '555-1234', 'password1'),
('user2', 'user2@example.com', '456 Elm St', '555-5678', 'password2'),
('user3', 'user3@example.com', '456 Midgar St', '999', 'password3');

INSERT INTO articles (title, content, publish_status, click_counter, likes_count, created_at, updated_at, published_at, account_id, reward_amount)
VALUES 
('Help, AirCon Leaking', 'Oh no, my air conditioner has started leaking recently,and I am not sure how to fix it :(. Any advice would be appreciated!', 1, 350, 30, '2025-02-11 08:00:00', '2025-02-11 10:30:00', '2024-02-11 11:00:00', 1, 100),
('Does anyone have salt to spare', 'Hey, I have recently gotten into cooking, but I ran out of salt! Is anyone able to spare some?', 1, 150, 15, '2025-01-20 10:00:00', '2025-01-20 12:15:00', '2025-01-20 11:00:00', 2, 500),
('Hosting Tea Party Event', 'Hey, Come Join us for a tea and talk session?', 1, 200, 60, '2025-01-20 11:00:00', '2025-01-20 12:30:00', '2025-01-20 11:00:00', 2, 50),
('Im so bored at home', 'I just moved into the neighborhood and have not made many new friends yet. Anyone up for hanging out?', 0, 0, 0, '2025-01-25 14:30:00', '2024-06-25 15:45:00', NULL, 1, 10);

INSERT INTO comments (article_id, account_id, comment_text, published_at)
VALUES 
(1, 2, 'Hello, you can check the ocular resistors to see if its causing a choke which may lead to the leakage', '2025-02-12 12:00:00'),
(2, 1, 'I do! I own many types such as himalayan, pink and sea salts!', '2025-01-21 13:00:00'),
(2, 1, 'I too have been into cooking recently! Lets cook together some time, Ill bring the salt', '2025-01-22 14:00:00');

INSERT INTO tags (tag_name) VALUES
('Help'),
('Events'),
('Notices');

INSERT INTO article_tags (article_id, tag_id) VALUES
(1, 1),
(2, 3),
(3, 2);

INSERT INTO rewards (reward_id, reward_name, reward_cost) VALUES
(1, 'Legendary Icon', 10000),
(2, 'Badge Of Honor', 50);

COMMIT;