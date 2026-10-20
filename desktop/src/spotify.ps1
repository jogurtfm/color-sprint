param([ValidateSet('status','play','pause','next','previous')][string]$Action='status')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $taskMethod=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation?1'} | Select-Object -First 1
  function Await-Media($Operation,[Type]$ResultType){
    $mediaTask=$taskMethod.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
    if(-not $mediaTask.Wait(4000)){throw 'Media request timed out'}
    return $mediaTask.GetAwaiter().GetResult()
  }
  $managerType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
  $propertyType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
  $manager=Await-Media ($managerType::RequestAsync()) $managerType
  # Never fall back to GetCurrentSession: that could control an unrelated player.
  $sessions=@($manager.GetSessions() | Where-Object {$_.SourceAppUserModelId -match '^(Spotify\.exe|SpotifyAB\.SpotifyMusic_[a-z0-9]+!Spotify)$'})
  if($sessions.Count -eq 0){@{available=$false;message='Open Spotify and play a track to connect local controls.'}|ConvertTo-Json -Compress;exit 0}
  $session=$sessions | Sort-Object {if($_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing'){0}else{1}} | Select-Object -First 1
  $accepted=$null
  switch($Action){
    'play' {$accepted=Await-Media ($session.TryPlayAsync()) ([bool])}
    'pause' {$accepted=Await-Media ($session.TryPauseAsync()) ([bool])}
    'next' {$accepted=Await-Media ($session.TrySkipNextAsync()) ([bool])}
    'previous' {$accepted=Await-Media ($session.TrySkipPreviousAsync()) ([bool])}
  }
  $info=$session.GetPlaybackInfo()
  $properties=Await-Media ($session.TryGetMediaPropertiesAsync()) $propertyType
  @{available=$true;title=$properties.Title;artist=$properties.Artist;playing=($info.PlaybackStatus.ToString() -eq 'Playing');play=$info.Controls.IsPlayEnabled;pause=$info.Controls.IsPauseEnabled;next=$info.Controls.IsNextEnabled;previous=$info.Controls.IsPreviousEnabled;accepted=$accepted;message=if($accepted -eq $false){'Spotify did not accept that command.'}else{''}}|ConvertTo-Json -Compress
} catch {
  # Avoid dumping unrelated session metadata or PowerShell diagnostic state.
  @{available=$false;message='Windows local Spotify controls are unavailable. Open Spotify or use its own controls.'}|ConvertTo-Json -Compress
}
