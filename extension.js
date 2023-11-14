/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from "gi://GObject";
import St from "gi://St";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import Soup from "gi://Soup";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

Gio._promisify(Soup.Session.prototype, "send_and_read_async");
Gio._promisify(Gio.OutputStream.prototype, "write_bytes_async");
Gio._promisify(Gio.IOStream.prototype, "close_async");
Gio._promisify(Gio.Subprocess.prototype, "wait_check_async");

const icons = {
  logging: "screenshot-ui-window-symbolic",
  active: "background-app-ghost-symbolic",
  inactive: "action-unavailable-symbolic",
};

let state = {
  token: "",
  logged: false,
  running: false,
  user: {
    username: "",
    password: "",
  },

};

const httpSession = new Soup.Session();

const getResult = (bytes) =>
  JSON.parse(new TextDecoder().decode(bytes.get_data()));

function isOk(message) {
  return message.get_status() === 200;
}

function log(data) {
  console.log('==========================')
  console.log(data)
  console.log('==========================')
}

async function login() {
  const form = {
    ...state.user
  };
  const message = Soup.Message.new_from_encoded_form(
    "POST",
    "http://localhost:2017/api/login",
    JSON.stringify(form)
  );
  try {
    const bytes = await httpSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      null
    );
    const res = getResult(bytes);
    if (isOk(message)) {
      state.token = res.data.token;
      state.logged = true;
    } else {
      state.logged = false;
      Main.notify("登录失败");
    }
  } catch (error) {
    //
  }
}

async function touch() {
  try {
    const message = Soup.Message.new("GET", "http://localhost:2017/api/touch");
    const headers = message.get_request_headers();
    headers.append("Authorization", state.token);
    const bytes = await httpSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      null
    );
    const res = getResult(bytes);
    if (isOk(message)) {
      state.running = res.data.running;
    } else {
      state.logged = false;
    }
  } catch (error) {
    log(error);
  }
}

async function toggle() {
  try {
    let method = state.running ? "DELETE" : "POST";
    const message = Soup.Message.new(method, "http://localhost:2017/api/v2ray");
    const headers = message.get_request_headers();
    headers.append("Authorization", state.token);
    const bytes = await httpSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      null
    );
    const res = getResult(bytes);
    if (isOk(message)) {
      state.running = res.data.running;
    } else {
      state.logged = false;
    }
  } catch (error) {
    //
  }
  log(state)
}

async function run() {
  try {
    await login();
    await touch();
  } catch (error) {
    log(error);
  }
}

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("My Shiny Indicator"));

      this.icon = new St.Icon({
        icon_name: icons.active,
        style_class: "system-status-icon",
      });

      this.add_child(this.icon);

      this.connect("button-press-event", () => {
        this.toggleProxy();
      });
    }

    async toggleProxy() {
      try {
        if (!state.logged) {
          await login();
        }
        if (state.logged) {
          await toggle();
        }
        this.render();
      } catch (error) {
        //
      }
    }
    render() {
      let icon_name = state.logged ? state.running ? icons.active : icons.inactive : icons.logging;
      this.icon.icon_name = icon_name
    }
  }
);

export default class ToggleProxyExtension extends Extension {
  enable() {
    this._settings = this.getSettings('org.gnome.shell.extensions.toggleproxy');
    state.user.username = this._settings.get_string('username')
    state.user.password = this._settings.get_string('password')
    this._settings.connect('changed', (settings, key) => {
      state.user[key] = settings.get_string(key)
      state.running = false
      state.logged = false
      this._indicator.render()
    })

    this._indicator = new Indicator();
    run().then(() => {
      this._indicator.render();
    });
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
