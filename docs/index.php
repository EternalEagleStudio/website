<?php

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';

$domain = $_SERVER['HTTP_HOST'];

$location = $protocol . $domain . '/EternalEagleStudio/src/index.html';

header("Location: $location", true, 301);

exit;

?>