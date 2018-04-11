<?php

namespace OCA\w2g2;

class File {
    protected $fileId;
    protected $lock;
    protected $groupFolderFileId;

    public function __construct($fileId)
    {
        $this->fileId = $fileId;

        $fileLocks = Database::getFileLock($this->fileId);

        $this->lock = empty($fileLocks) ? null : $fileLocks[0];

        $groupFolderFile = empty(Database::getGroupFolderFile()) ? null : Database::getGroupFolderFile()[0];
        $this->groupFolderFileId = ($groupFolderFile === null) ? null : $groupFolderFile['fileid'];
    }

    public function isLocked()
    {
        return !! $this->lock;
    }

    public function getLocker()
    {
        return $this->lock['locked_by'];
    }

    public function lock($lockedBy)
    {
        Database::lockFile($this->fileId, $lockedBy);

        Event::emit('lock', $this->fileId, User::getDisplayName($lockedBy));
    }

    public function unlock()
    {
        Database::unlockFile($this->fileId);

        Event::emit('unlock', $this->fileId, User::getDisplayName($this->getLocker()));
    }

    public function canBeUnlockedBy($user)
    {
        return $this->getLocker() === $user;
    }

    public function isGroupFolder()
    {
        return $this->getParentId() === $this->groupFolderFileId;
    }

    public function getParentId()
    {
        return ($this->getCompleteData())['parent'];
    }

    public function getCompleteData()
    {
        $files = Database::getFile($this->fileId);

        if (empty($files)) {
            return null;
        }

        return $files[0];
    }
}
