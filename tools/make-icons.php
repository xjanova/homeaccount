<?php
// make-icons.php — generate PWA PNG icons (gold rounded tile + ฿) with GD.
// Run on the server during deploy:  php tools/make-icons.php /path/to/public/icons
$out = $argv[1] ?? (__DIR__ . '/../public/icons');
@mkdir($out, 0755, true);

function draw($size, $maskable, $out){
  $im = imagecreatetruecolor($size, $size);
  imagesavealpha($im, true);
  imagefill($im, 0, 0, imagecolorallocatealpha($im, 0,0,0,127));
  $pad = $maskable ? (int)($size*0.10) : (int)($size*0.06);
  $r   = $maskable ? (int)($size*0.20) : (int)($size*0.22);
  // gradient fill (vertical-ish) inside rounded rect
  $x0=$pad; $y0=$pad; $x1=$size-$pad; $y1=$size-$pad;
  for($y=$y0; $y<$y1; $y++){
    $tt = ($y-$y0)/max(1,($y1-$y0));
    $cr = (int)(0xe6 + (0xd9-0xe6)*$tt);
    $cg = (int)(0xb3 + (0x8e-0xb3)*$tt);
    $cb = (int)(0x47 + (0x3f-0x47)*$tt);
    $col = imagecolorallocate($im, $cr,$cg,$cb);
    imageline($im, $x0, $y, $x1-1, $y, $col);
  }
  // round the corners by erasing
  $bg = imagecolorallocatealpha($im,0,0,0,127);
  rounded_mask($im, $x0,$y0,$x1,$y1,$r,$bg);
  // ฿ glyph (use a built-in font scaled; fallback to "B")
  $white = imagecolorallocate($im,255,255,255);
  $txt = '฿';
  $fontFile = null;
  foreach(['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] as $f){ if(is_file($f)){ $fontFile=$f; break; } }
  if($fontFile && function_exists('imagettftext')){
    $fs = (int)($size*0.5); $txt2='฿';
    $bbox = imagettfbbox($fs,0,$fontFile,$txt2);
    // DejaVu may lack ฿; fall back to "B" if width is zero
    if(($bbox[2]-$bbox[0])<5){ $txt2='B'; $bbox=imagettfbbox($fs,0,$fontFile,$txt2); }
    $tw=$bbox[2]-$bbox[0]; $th=$bbox[7]-$bbox[1];
    $tx=(int)(($size-$tw)/2 - $bbox[0]); $ty=(int)(($size-$th)/2 - $bbox[1]);
    imagettftext($im,$fs,0,$tx,$ty,$white,$fontFile,$txt2);
  } else {
    $fs=5; $tw=imagefontwidth($fs); $th=imagefontheight($fs);
    imagestring($im,$fs,(int)(($size-$tw)/2),(int)(($size-$th)/2),'B',$white);
  }
  imagepng($im, $out);
  imagedestroy($im);
  echo "wrote $out\n";
}
function rounded_mask($im,$x0,$y0,$x1,$y1,$r,$bg){
  // erase the 4 corner squares outside the circle radius
  $corners=[[$x0,$y0,1,1],[$x1-1,$y0,-1,1],[$x0,$y1-1,1,-1],[$x1-1,$y1-1,-1,-1]];
  foreach($corners as $c){
    list($cx,$cy,$sx,$sy)=$c;
    $ccx=$cx+$sx*$r; $ccy=$cy+$sy*$r;
    for($i=0;$i<$r;$i++) for($j=0;$j<$r;$j++){
      $px=$cx+$sx*$i; $py=$cy+$sy*$j;
      if((($px-$ccx)**2+($py-$ccy)**2) > $r*$r) imagesetpixel($im,$px,$py,$bg);
    }
  }
}

if(!function_exists('imagecreatetruecolor')){ fwrite(STDERR,"GD not available\n"); exit(1); }
draw(192,false,"$out/icon-192.png");
draw(512,false,"$out/icon-512.png");
draw(192,true, "$out/icon-maskable-192.png");
draw(512,true, "$out/icon-maskable-512.png");
echo "done\n";
