function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

function checkLoggedIn(req, res, next) {
    req.isLoggedIn = !!req.session.userId;
    next();
}

module.exports = {
    requireLogin,
    checkLoggedIn
};