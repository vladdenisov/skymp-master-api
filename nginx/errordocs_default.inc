set $errordocs /usr/share/nginx/html;

error_page 401 /401.html;
location = /401.html {
  root $errordocs;
  internal;
}

error_page 403 /403.html;
location = /403.html {
  root $errordocs;
  internal;
}

error_page 404 /404.html;
location = /404.html {
  root $errordocs;
  internal;
}

error_page 500 /500.html;
location = /500.html {
  root $errordocs;
  internal;
}

error_page 502 /502.html;
location = /502.html {
  root $errordocs;
  internal;
}

error_page 503 /503.html;
location = /503.html {
  root $errordocs;
  internal;
}