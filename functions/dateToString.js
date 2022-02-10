module.exports = date =>
   /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : `${date.getFullYear()}-${date.getMonth() < 9 ? '0' : ''}${date.getMonth() + 1}-${
           date.getDate() < 10 ? '0' : ''
        }${date.getDate()}`;
