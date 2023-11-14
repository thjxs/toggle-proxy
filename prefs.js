import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import Gio from 'gi://Gio'

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class ToggleProxyExtensionPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    window._settings = this.getSettings('org.gnome.shell.extensions.toggleproxy')
    const page = new Adw.PreferencesPage({
      title: 'Toggle Proxy',
      icon_name: 'dialog-information-symbolic'
    })
    window.add(page)

    const group = new Adw.PreferencesGroup({
      title: 'Account',
      description: 'Your account information'
    })
    page.add(group)

    const usernameRow = new Adw.EntryRow({
      title: 'Username',
      text: '',
    })
    group.add(usernameRow)
    const passwordRow = new Adw.EntryRow({
      title: 'Password',
      text: '',
    })
    group.add(passwordRow)

    window._settings.bind('username', usernameRow, 'text', Gio.SettingsBindFlags.DEFAULT)
    window._settings.bind('password', passwordRow, 'text', Gio.SettingsBindFlags.DEFAULT)
  }
}
